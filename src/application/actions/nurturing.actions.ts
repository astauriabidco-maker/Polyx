'use server';

import { prisma } from '@/lib/prisma';
import { NurturingService } from '@/application/services/nurturing.service';
import { revalidatePath } from 'next/cache';

/**
 * Fetches all active nurturing sequences for an organisation.
 */
export async function getNurturingSequencesAction(organisationId: string) {
    try {
        const sequences = await prisma.nurturingSequence.findMany({
            where: { organisationId, isActive: true },
            include: { steps: { orderBy: { order: 'asc' } } }
        });
        return { success: true, sequences };
    } catch (error: any) {
        console.error("Get Sequences Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Enrolls a lead into a specific nurturing sequence.
 */
export async function enrollLeadAction(leadId: string, sequenceId: string, organisationId: string) {
    try {
        const enrollment = await NurturingService.enrollLead(leadId, sequenceId, organisationId);
        revalidatePath(`/app/leads`);
        return { success: true, enrollment };
    } catch (error: any) {
        console.error("Enroll Lead Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Cancels active enrollments for a lead.
 */
export async function cancelEnrollmentAction(leadId: string, sequenceId?: string) {
    try {
        await NurturingService.cancelLeadEnrollments(leadId);
        revalidatePath(`/app/leads`);
        return { success: true };
    } catch (error: any) {
        console.error("Cancel Enrollment Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetches current and past enrollments for a lead.
 */
export async function getLeadEnrollmentsAction(leadId: string) {
    try {
        const enrollments = await prisma.nurturingEnrollment.findMany({
            where: { leadId },
            include: {
                sequence: true,
                tasks: {
                    orderBy: { scheduledAt: 'asc' },
                    include: { step: true }
                }
            }
        });
        return { success: true, enrollments };
    } catch (error: any) {
        console.error("Get Lead Enrollments Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Manual trigger to process due tasks.
 * In production, this would be called by a CRON job.
 */
export async function processNurturingTasksAction() {
    try {
        const count = await NurturingService.processDueTasks();
        revalidatePath(`/app/leads`);
        return { success: true, processedCount: count };
    } catch (error: any) {
        console.error("Process Tasks Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Creates a new nurturing sequence with its steps.
 */
export async function createNurturingSequenceAction(data: {
    organisationId: string,
    name: string,
    description?: string,
    steps: {
        order: number,
        type: string,
        channel: string,
        delayInHours: number,
        subject?: string,
        content: string
    }[]
}) {
    try {
        const sequence = await prisma.nurturingSequence.create({
            data: {
                organisationId: data.organisationId,
                name: data.name,
                description: data.description,
                steps: {
                    create: data.steps
                }
            },
            include: { steps: { orderBy: { order: 'asc' } } }
        });
        return { success: true, sequence };
    } catch (error: any) {
        console.error("Create Sequence Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Updates an existing nurturing sequence.
 */
export async function updateNurturingSequenceAction(sequenceId: string, data: {
    name?: string,
    description?: string,
    isActive?: boolean
}) {
    try {
        const sequence = await prisma.nurturingSequence.update({
            where: { id: sequenceId },
            data: {
                name: data.name,
                description: data.description,
                isActive: data.isActive
            },
            include: { steps: { orderBy: { order: 'asc' } } }
        });
        return { success: true, sequence };
    } catch (error: any) {
        console.error("Update Sequence Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Deletes a nurturing sequence and all its steps/enrollments/tasks.
 */
export async function deleteNurturingSequenceAction(sequenceId: string) {
    try {
        // Delete in order: Tasks -> Enrollments -> Steps -> Sequence (cascade should handle most)
        await prisma.nurturingSequence.delete({
            where: { id: sequenceId }
        });
        return { success: true };
    } catch (error: any) {
        console.error("Delete Sequence Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Updates a full sequence including its steps (replaces all steps).
 */
export async function updateFullSequenceAction(sequenceId: string, data: {
    name: string,
    description?: string,
    steps: {
        id?: string,
        order: number,
        type: string,
        channel: string,
        delayInHours: number,
        subject?: string,
        content: string
    }[]
}) {
    try {
        // 1. Update sequence metadata
        await prisma.nurturingSequence.update({
            where: { id: sequenceId },
            data: {
                name: data.name,
                description: data.description
            }
        });

        // 2. Delete existing steps
        await prisma.nurturingStep.deleteMany({
            where: { sequenceId }
        });

        // 3. Create new steps
        for (const step of data.steps) {
            await prisma.nurturingStep.create({
                data: {
                    sequenceId,
                    order: step.order,
                    type: step.type,
                    channel: step.channel,
                    delayInHours: step.delayInHours,
                    subject: step.subject,
                    content: step.content
                }
            });
        }

        // 4. Return updated sequence
        const sequence = await prisma.nurturingSequence.findUnique({
            where: { id: sequenceId },
            include: { steps: { orderBy: { order: 'asc' } } }
        });

        return { success: true, sequence };
    } catch (error: any) {
        console.error("Update Full Sequence Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Calculates ROI metrics for all active sequences in an organization.
 * Metrics:
 * - enrolled: Total leads ever enrolled in the sequence
 * - active: Leads currently in the sequence
 * - converted: Leads who were in the sequence and are now RDV_FIXE (or later stage)
 * - lost: Leads who finished the sequence without converting
 * - rate: Conversion rate %
 */
export async function getMarketingRoiAction(organisationId: string) {
    try {
        const sequences = await prisma.nurturingSequence.findMany({
            where: { organisationId, isActive: true },
            include: {
                enrollments: {
                    include: {
                        lead: {
                            select: { status: true }
                        }
                    }
                }
            }
        });

        const roiData = sequences.map(seq => {
            const totalEnrolled = seq.enrollments.length;
            const active = seq.enrollments.filter(e => e.status === 'ACTIVE').length;

            // Conversion definition: Lead Status is RDV_FIXE
            const converted = seq.enrollments.filter(e =>
                e.lead.status === 'RDV_FIXE' ||
                e.lead.status === 'SIGNED' ||
                e.lead.status === 'CONVERTED'
            ).length;

            const rate = totalEnrolled > 0 ? Math.round((converted / totalEnrolled) * 100) : 0;

            return {
                id: seq.id,
                name: seq.name,
                totalEnrolled,
                active,
                converted,
                rate
            };
        });

        // Sort by Conversion Rate DESC
        return { success: true, data: roiData.sort((a, b) => b.rate - a.rate) };
    } catch (error: any) {
        console.error("ROI Action Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Toggles the Opt-out status of a lead.
 * If opting out: cancels all active enrollments.
 */
export async function toggleLeadOptOutAction(leadId: string, isOptOut: boolean) {
    try {
        if (isOptOut) {
            await NurturingService.optOutLead(leadId);
        } else {
            await NurturingService.optInLead(leadId);
        }
        revalidatePath(`/app/leads`);
        return { success: true };
    } catch (error: any) {
        console.error("Toggle Opt-Out Error:", error);
        return { success: false, error: error.message };
    }
}
