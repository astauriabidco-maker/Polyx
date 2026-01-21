'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { LeadService } from '@/application/services/lead.service';
import { CallOutcome as DomainCallOutcome, RefusalReason, LeadStatus } from '@/domain/entities/lead';
import { LearnerService } from '@/application/services/learner.service';
import { verifyToken } from '@/lib/security';

// Helper to get current user ID
async function getCurrentUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    return payload?.userId || null;
}

// ============================================
// ACTIVITY ACTIONS
// ============================================

export type ActivityType = 'NOTE' | 'CALL' | 'EMAIL' | 'STATUS_CHANGE' | 'MEETING' | 'CREATED' | 'SMS' | 'WHATSAPP';

export async function getLeadActivitiesAction(leadId: string) {
    try {
        const activities = await prisma.leadActivity.findMany({
            where: { leadId },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, activities };
    } catch (e) {
        console.error('[Activity] Error fetching:', e);
        return { success: false, error: 'Erreur lors du chargement des activités' };
    }
}

export async function addLeadActivityAction(
    leadId: string,
    type: ActivityType,
    content?: string,
    metadata?: Record<string, unknown>
) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Non authentifié');

        const activity = await prisma.leadActivity.create({
            data: {
                leadId,
                type,
                content,
                metadata: metadata ? JSON.stringify(metadata) : null,
                userId
            }
        });

        revalidatePath('/app/leads');
        revalidatePath('/app/crm');

        return { success: true, activity };
    } catch (e) {
        console.error('[Activity] Error creating:', e);
        return { success: false, error: 'Erreur lors de l\'ajout de l\'activité' };
    }
}

// Auto-log helper for status changes (to be called from updateLeadAction)
export async function logStatusChangeActivity(
    leadId: string,
    userId: string,
    oldStatus: string,
    newStatus: string
) {
    await prisma.leadActivity.create({
        data: {
            leadId,
            type: 'STATUS_CHANGE',
            content: `Statut changé de ${oldStatus} à ${newStatus}`,
            metadata: JSON.stringify({ from: oldStatus, to: newStatus }),
            userId
        }
    });
}

// Auto-log helper for lead creation
export async function logLeadCreatedActivity(leadId: string, userId: string) {
    await prisma.leadActivity.create({
        data: {
            leadId,
            type: 'CREATED',
            content: 'Lead créé',
            userId
        }
    });
}

// ============================================
// CALL ACTIONS
// ============================================

export type CallOutcome = 'ANSWERED' | 'NO_ANSWER' | 'BUSY' | 'VOICEMAIL' | 'WRONG_NUMBER' | 'APPOINTMENT_SET' | 'CALLBACK_SCHEDULED' | 'REFUSAL';

export async function getLeadCallsAction(leadId: string) {
    try {
        const calls = await prisma.call.findMany({
            where: { leadId },
            include: {
                caller: {
                    select: { id: true, firstName: true, lastName: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, calls };
    } catch (e) {
        console.error('[Call] Error fetching:', e);
        return { success: false, error: 'Erreur lors du chargement des appels' };
    }
}

export async function logCallAction(
    leadId: string,
    outcome: CallOutcome,
    duration?: number,
    notes?: string,
    callbackAt?: Date,
    refusalReason?: RefusalReason
) {
    try {
        const callerId = await getCurrentUserId();
        if (!callerId) throw new Error('Non authentifié');

        // 1. Fetch current lead
        const lead = await prisma.lead.findUnique({
            where: { id: leadId }
        });
        if (!lead) throw new Error('Lead introuvable');

        // 2. Create call record
        const call = await prisma.call.create({
            data: {
                leadId,
                outcome,
                duration,
                notes,
                callbackAt,
                callerId
            }
        });

        // 3. Apply Domain Logic (Status transitions, history)
        // Note: Casting action outcome to domain outcome as they are now synced
        const updatedLeadData = LeadService.registerInteraction(
            { ...lead, history: [] } as any,
            callerId,
            outcome as unknown as DomainCallOutcome,
            {
                nextCallback: callbackAt,
                refusalReason,
                note: notes
            }
        );

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                status: updatedLeadData.status,
                salesStage: updatedLeadData.salesStage,
                lastCallDate: updatedLeadData.lastCallDate,
                nextCallbackAt: updatedLeadData.nextCallbackAt,
                callAttempts: updatedLeadData.callAttempts,
                updatedAt: new Date()
            }
        });

        // [NEW] CRM Bridge: If status became RDV_FIXE, ensure Learner dossier exists
        if (updatedLeadData.status === LeadStatus.RDV_FIXE) {
            await LearnerService.bridgeLeadToLearner(leadId, lead.organisationId, lead.agencyId || undefined);
        }

        // [NEW] Trigger Nurturing on NRP (No Answer)
        if (outcome === 'NO_ANSWER') {
            const { NurturingService } = await import('@/application/services/nurturing.service');
            await NurturingService.triggerNrpRelance(leadId, lead.organisationId);
        }

        // 5. Create activity record
        const statusChanged = updatedLeadData.status !== lead.status;
        await prisma.leadActivity.create({
            data: {
                leadId,
                type: statusChanged ? 'STATUS_CHANGE' : 'CALL',
                content: `Appel: ${outcome}${refusalReason ? ` (Motif: ${refusalReason})` : ''}${notes ? ` - ${notes}` : ''}`,
                metadata: JSON.stringify({
                    outcome,
                    duration,
                    callbackAt,
                    refusalReason,
                    fromStatus: lead.status,
                    toStatus: updatedLeadData.status
                }),
                userId: callerId
            }
        });

        revalidatePath('/app/leads');
        revalidatePath('/app/crm');
        revalidatePath('/app/dashboard');
        revalidatePath(`/app/leads/${leadId}`);

        return { success: true, call };
    } catch (e) {
        console.error('[Call] Error logging:', e);
        return { success: false, error: 'Erreur lors de l\'enregistrement de l\'appel' };
    }
}

// Get callbacks for a user (for Sales Cockpit)
export async function getMyCallbacksAction() {
    try {
        const userId = await getCurrentUserId();
        if (!userId) return { success: false, error: 'Non authentifié' };

        const now = new Date();
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const callbacks = await prisma.lead.findMany({
            where: {
                nextCallbackAt: {
                    gte: now,
                    lte: endOfDay
                },
                assignedUserId: userId
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                nextCallbackAt: true
            },
            orderBy: { nextCallbackAt: 'asc' }
        });

        return { success: true, callbacks };
    } catch (e) {
        console.error('[Callback] Error fetching:', e);
        return { success: false, error: 'Erreur' };
    }
}

// Helper
function getOutcomeLabel(outcome: CallOutcome): string {
    const labels: Record<CallOutcome, string> = {
        ANSWERED: 'Répondu',
        NO_ANSWER: 'Pas de réponse',
        BUSY: 'Occupé',
        VOICEMAIL: 'Messagerie',
        WRONG_NUMBER: 'Faux numéro',
        APPOINTMENT_SET: 'RDV Fixé',
        CALLBACK_SCHEDULED: 'Rappel programmé',
        REFUSAL: 'Refus'
    };
    return labels[outcome] || outcome;
}
