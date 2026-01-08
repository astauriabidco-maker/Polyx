import { prisma } from '@/lib/prisma';
import { NurturingEnrollmentStatus, NurturingTaskStatus } from '@/domain/entities/nurturing';
import { addHours } from 'date-fns';

export class NurturingService {
    /**
     * Enrolls a lead into a sequence.
     * Schedules all steps as PENDING tasks.
     */
    static async enrollLead(leadId: string, sequenceId: string, organisationId: string) {
        // 1. Get sequence and steps
        const sequence = await prisma.nurturingSequence.findUnique({
            where: { id: sequenceId },
            include: { steps: { orderBy: { order: 'asc' } } }
        });

        if (!sequence) throw new Error('Sequence not found');

        // 2. Cancel existing active enrollments for this sequence/lead if any
        await this.cancelLeadEnrollments(leadId, sequenceId);

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

        // Load lead data for hydration
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });

        for (const step of sequence.steps) {
            cumulativeDelay += step.delayInHours;
            const scheduledAt = addHours(new Date(), cumulativeDelay);

            const hydratedContent = this.hydrateTemplate(step.content, lead);

            tasks.push(prisma.nurturingTask.create({
                data: {
                    leadId,
                    organisationId,
                    enrollmentId: enrollment.id,
                    stepId: step.id,
                    type: step.type,
                    channel: step.channel,
                    scheduledAt,
                    status: NurturingTaskStatus.PENDING,
                    content: hydratedContent,
                }
            }));
        }

        await Promise.all(tasks);
        return enrollment;
    }

    /**
     * Cancels all active enrollments for a lead (optionally filtered by sequence).
     */
    static async cancelLeadEnrollments(leadId: string, sequenceId?: string) {
        const where: any = { leadId, status: NurturingEnrollmentStatus.ACTIVE };
        if (sequenceId) where.sequenceId = sequenceId;

        const activeEnrollments = await prisma.nurturingEnrollment.findMany({ where });

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
                // 1. Simulate sending (Log to activity)
                await prisma.leadActivity.create({
                    data: {
                        leadId: task.leadId,
                        userId: 'SYSTEM',
                        type: task.type === 'SMS' ? 'SMS' : 'EMAIL',
                        content: `[Automatique] ${task.content}`,
                        metadata: JSON.stringify({
                            nurturingTaskId: task.id,
                            channel: task.channel
                        })
                    }
                });

                // 2. Mark as executed
                await prisma.nurturingTask.update({
                    where: { id: task.id },
                    data: {
                        status: NurturingTaskStatus.EXECUTED,
                        executedAt: new Date()
                    }
                });

                // 3. Auto-complete enrollment if no tasks left
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
}
