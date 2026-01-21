import { prisma } from '@/lib/prisma';
import { NurturingEnrollmentStatus, NurturingTaskStatus } from '@/domain/entities/nurturing';
import { addHours } from 'date-fns';
import { TwilioService } from './twilio.service';

/**
 * Nurturing Service
 * Manages campaigns, sequences and automatic tasks (Email, SMS, WhatsApp)
 */
export class NurturingService {
    /**
     * Enrolls a lead into a sequence.
     * Schedules all steps as PENDING tasks.
     */
    static async enrollLead(leadId: string, sequenceId: string, organisationId: string) {
        // 0. Check Opt-out
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) throw new Error('Lead not found');
        if (lead.optOut) throw new Error('Lead has opted out of marketing communications (RGPD).');

        // 1. Get sequence and steps
        const sequence = await prisma.nurturingSequence.findUnique({
            where: { id: sequenceId },
            include: { steps: { orderBy: { order: 'asc' } } }
        });

        if (!sequence) throw new Error('Sequence not found');

        // 2. Cancel existing active enrollments for this lead
        await this.cancelLeadEnrollments(leadId);

        // 3. Create Enrollment
        const enrollment = await prisma.nurturingEnrollment.create({
            data: {
                leadId,
                sequenceId,
                status: NurturingEnrollmentStatus.ACTIVE,
            }
        });

        // 4. Schedule Steps
        const tasks = [];
        let cumulativeDelay = 0;

        for (const step of sequence.steps) {
            cumulativeDelay += step.delayInHours;
            const scheduledAt = addHours(new Date(), cumulativeDelay);

            // A/B Testing Logic
            // If Step has contentB, randomly assign 'A' or 'B'.
            const isAbTest = !!step.contentB;
            const variant = isAbTest ? (Math.random() < 0.5 ? 'A' : 'B') : 'A';

            const rawContent = variant === 'B' && step.contentB ? step.contentB : step.content;
            const hydratedContent = this.hydrateTemplate(rawContent, lead);

            tasks.push(prisma.nurturingTask.create({
                data: {
                    leadId,
                    organisationId,
                    enrollmentId: enrollment.id,
                    stepId: step.id,
                    type: step.type as any,
                    channel: step.channel as any,
                    scheduledAt,
                    status: NurturingTaskStatus.PENDING,
                    content: hydratedContent,
                    variant: variant // Store tracking info
                }
            }));
        }

        await Promise.all(tasks);
        return enrollment;
    }

    /**
     * Cancels all active enrollments for a lead.
     */
    static async cancelLeadEnrollments(leadId: string) {
        const activeEnrollments = await prisma.nurturingEnrollment.findMany({
            where: { leadId, status: NurturingEnrollmentStatus.ACTIVE }
        });

        for (const enrollment of activeEnrollments) {
            // Cancel tasks
            await prisma.nurturingTask.updateMany({
                where: { enrollmentId: enrollment.id, status: NurturingTaskStatus.PENDING },
                data: { status: NurturingTaskStatus.CANCELLED }
            });

            // Update enrollment status
            await prisma.nurturingEnrollment.update({
                where: { id: enrollment.id },
                data: {
                    status: NurturingEnrollmentStatus.CANCELLED,
                    cancelledAt: new Date()
                }
            });
        }
    }

    /**
     * Triggers the automatic NRP relance sequence.
     * Sequence: WhatsApp (Immediate/1h) -> SMS (24h) -> WhatsApp (48h)
     */
    static async triggerNrpRelance(leadId: string, organisationId: string) {
        const SEQUENCE_NAME = "Relance NRP (Automatique)";

        // 1. Find the sequence
        let sequence = await prisma.nurturingSequence.findFirst({
            where: { organisationId, name: SEQUENCE_NAME, isActive: true }
        });

        // 2. Create default if missing
        if (!sequence) {
            sequence = await prisma.nurturingSequence.create({
                data: {
                    organisationId,
                    name: SEQUENCE_NAME,
                    description: "Séquence automatique lancée après un appel sans réponse (NRP).",
                    steps: {
                        create: [
                            {
                                order: 1,
                                type: 'WHATSAPP',
                                channel: 'WHATSAPP',
                                delayInHours: 1, // Start 1h after call
                                content: "Bonjour {{firstName}}, j'ai tenté de vous joindre concernant votre demande de formation. N'hésitez pas à me dire quand vous seriez disponible pour un court échange. Bonne journée !"
                            },
                            {
                                order: 2,
                                type: 'SMS',
                                channel: 'SMS',
                                delayInHours: 23, // Total 24h
                                content: "Bonjour {{firstName}}, je reviens vers vous concernant votre projet. Vous pouvez me rappeler au {{phone}} ou répondre à ce message. Merci !"
                            },
                            {
                                order: 3,
                                type: 'WHATSAPP',
                                channel: 'WHATSAPP',
                                delayInHours: 24, // Total 48h
                                content: "Dernière tentative pour vous joindre {{firstName}}, n'hésitez pas à revenir vers nous si votre projet est toujours d'actualité. Excellente journée !"
                            }
                        ]
                    }
                }
            });
        }

        // 3. Enroll the lead
        return await this.enrollLead(leadId, sequence.id, organisationId);
    }

    /**
     * Processes pending tasks that are due.
     */
    static async processDueTasks() {
        const now = new Date();
        const dueTasks = await prisma.nurturingTask.findMany({
            where: {
                status: NurturingTaskStatus.PENDING,
                scheduledAt: { lte: now }
            },
            include: { lead: true }
        });

        for (const task of dueTasks) {
            try {
                // 0. Double check Opt-out status before sending
                if (task.lead.optOut) {
                    console.warn(`[Nurturing] Skipped task ${task.id} because lead ${task.leadId} has opted out.`);
                    await prisma.nurturingTask.update({
                        where: { id: task.id },
                        data: { status: NurturingTaskStatus.CANCELLED }
                    });
                    continue;
                }

                // 1. Send via real provider if configured
                if (task.channel === 'SMS' || task.channel === 'WHATSAPP') {
                    const twilio = await TwilioService.create(task.organisationId);
                    if (twilio && task.lead.phone) {
                        if (task.channel === 'SMS') {
                            await twilio.sendSms(task.lead.phone, task.content);
                        } else {
                            await twilio.sendWhatsApp(task.lead.phone, task.content);
                        }
                        console.log(`[Nurturing] Sent ${task.channel} to ${task.lead.phone}`);
                    } else {
                        console.log(`[Nurturing] Simulation only for task ${task.id} (Twilio not configured)`);
                    }
                }

                // 2. Log to activity
                await prisma.leadActivity.create({
                    data: {
                        leadId: task.leadId,
                        userId: 'SYSTEM',
                        type: 'COMMUNICATION' as any,
                        content: `[Automatique ${task.channel}${task.variant && task.variant !== 'A' ? ' (Var. ' + task.variant + ')' : ''}] ${task.content}`,
                        metadata: JSON.stringify({
                            nurturingTaskId: task.id,
                            channel: task.channel,
                            variant: task.variant
                        })
                    }
                });

                // 3. Mark as executed
                await prisma.nurturingTask.update({
                    where: { id: task.id },
                    data: {
                        status: NurturingTaskStatus.EXECUTED,
                        executedAt: new Date()
                    }
                });

                // 4. Auto-complete enrollment if no tasks left
                if (task.enrollmentId) {
                    const remainingTasksCount = await prisma.nurturingTask.count({
                        where: {
                            enrollmentId: task.enrollmentId,
                            status: NurturingTaskStatus.PENDING
                        }
                    });

                    if (remainingTasksCount === 0) {
                        await prisma.nurturingEnrollment.update({
                            where: { id: task.enrollmentId },
                            data: {
                                status: NurturingEnrollmentStatus.COMPLETED,
                                completedAt: new Date()
                            }
                        });
                    }
                }

            } catch (error) {
                console.error(`[Nurturing] Failed to process task ${task.id}:`, error);
                await prisma.nurturingTask.update({
                    where: { id: task.id },
                    data: { status: NurturingTaskStatus.FAILED }
                });
            }
        }

        return dueTasks.length;
    }

    private static hydrateTemplate(content: string, lead: any) {
        if (!lead) return content;
        return content
            .replace(/{{firstName}}/g, lead.firstName || '')
            .replace(/{{lastName}}/g, lead.lastName || '')
            .replace(/{{phone}}/g, lead.phone || '');
    }

    /**
     * Opt-out a lead from all marketing communications.
     * Cancels all active enrollments.
     */
    static async optOutLead(leadId: string) {
        await prisma.lead.update({
            where: { id: leadId },
            data: {
                optOut: true,
                optOutDate: new Date()
            }
        });

        await this.cancelLeadEnrollments(leadId);

        // Also log activity
        await prisma.leadActivity.create({
            data: {
                leadId,
                userId: 'SYSTEM',
                type: 'NOTE' as any,
                content: "🛑 Le lead s'est désabonné (Opt-out RGPD).",
            }
        });
    }

    /**
     * Re-subscribe a lead (Opt-in).
     */
    static async optInLead(leadId: string) {
        await prisma.lead.update({
            where: { id: leadId },
            data: {
                optOut: false,
                optOutDate: null
            }
        });

        await prisma.leadActivity.create({
            data: {
                leadId,
                userId: 'SYSTEM',
                type: 'NOTE' as any,
                content: "✅ Le lead s'est réabonné (Opt-in).",
            }
        });
    }
}
