'use server';

import { prisma } from '@/lib/prisma';
import { Lead, LeadWithOrg, LeadStatus, SalesStage } from '@/domain/entities/lead';
import { getAgencyWhereClause, getConsolidatedAgencyWhereClause } from '@/lib/auth-utils';
import { LeadService } from '@/application/services/lead.service';
import { AttributionService } from '@/application/services/attribution.service';
import { GamificationService, GamificationActivity } from '@/application/services/gamification.service';
import { revalidatePath } from 'next/cache';

// Mimics a real DB query with latency
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function getLeadsAction(organizationIdOrIds: string | string[], isUnified: boolean = false, agencyId?: string): Promise<{ success: boolean, leads?: LeadWithOrg[], error?: string }> {
    try {
        let resultLeads: any[] = [];
        let whereClause: any;

        if (Array.isArray(organizationIdOrIds)) {
            whereClause = await getConsolidatedAgencyWhereClause(organizationIdOrIds);
        } else {
            whereClause = await getAgencyWhereClause(organizationIdOrIds, agencyId);
        }

        resultLeads = await (prisma as any).lead.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                organisation: true,
                assessmentSessions: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        const enrichedLeads: LeadWithOrg[] = resultLeads.map(lead => ({
            id: lead.id,
            organizationId: lead.organisationId,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            street: lead.street,
            zipCode: lead.zipCode,
            city: lead.city,
            source: lead.source,
            status: lead.status as LeadStatus,
            salesStage: lead.salesStage as SalesStage,
            score: lead.score || 50,
            assignedUserId: lead.assignedUserId,
            agencyId: lead.agencyId,
            examId: lead.examId,
            callAttempts: lead.callAttempts || 0,
            notes: lead.notes || '',
            history: [], // Would fetch Activities in real app
            metadata: lead.metadata || {},
            organizationName: lead.organisation?.name || 'Inconnu',
            assessmentSessions: lead.assessmentSessions || [],
            createdAt: lead.createdAt || new Date(),
            updatedAt: lead.updatedAt || new Date()
        }));

        return { success: true, leads: enrichedLeads };
    } catch (e: any) {
        console.error("Get Leads Error:", e);
        return { success: false, error: e.message || "Failed to fetch leads" };
    }
}

export async function bulkUpdateLeadsAction(leadIds: string[], data: Partial<Lead>): Promise<{ success: boolean }> {
    try {
        await (prisma as any).lead.updateMany({
            where: { id: { in: leadIds } },
            data: {
                status: data.status,
                salesStage: data.salesStage,
                assignedUserId: data.assignedUserId,
                agencyId: data.agencyId
            }
        });
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}

export async function updateLeadAction(leadId: string, data: Partial<Lead>): Promise<{ success: boolean, lead?: Lead, error?: string }> {
    try {
        // [GUARD] RDV Consistency Check
        if (data.status === LeadStatus.RDV_FIXE || data.salesStage === SalesStage.RDV_FIXE) {
            const current = await (prisma as any).lead.findUnique({
                where: { id: leadId },
                select: { status: true, salesStage: true }
            });

            // If strictly transitioning TO RDV_FIXE from another status, Block it.
            // (Allow updates if already in RDV_FIXE, e.g. modifying notes)
            const isAlreadyRdv = current?.status === LeadStatus.RDV_FIXE || current?.salesStage === SalesStage.RDV_FIXE;

            if (!isAlreadyRdv) {
                return {
                    success: false,
                    error: "Action bloquée : Pour passer en RDV_FIXE, vous devez utiliser le module 'Prise de RDV' afin de générer l'événement dans l'agenda."
                };
            }
        }

        const updated: any = await (prisma as any).lead.update({
            where: { id: leadId },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone,
                status: data.status,
                salesStage: data.salesStage,
                score: data.score,
                assignedUserId: data.assignedUserId,
                agencyId: data.agencyId,
                notes: data.notes
            },
            include: { touchpoints: true }
        });

        const mapped: Lead = {
            id: updated.id,
            organizationId: updated.organisationId,
            firstName: updated.firstName,
            lastName: updated.lastName,
            email: updated.email,
            phone: updated.phone,
            status: updated.status as LeadStatus,
            salesStage: updated.salesStage as SalesStage,
            history: [],
            score: updated.score,
            source: updated.source || 'autre',
            callAttempts: updated.callAttempts || 0,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt
        };

        return { success: true, lead: mapped };
    } catch (e: any) {
        console.error("Update Lead Error:", e);
        return { success: false, error: e.message || "Erreur de mise à jour" };
    }
}

export async function getSalesRepsAction(organisationId: string): Promise<{ success: boolean, users: { id: string, name: string }[] }> {
    try {
        console.log(`[getSalesRepsAction] Fetching for org: ${organisationId}`);
        const grants = await (prisma as any).userAccessGrant.findMany({
            where: { organisationId },
            include: { user: true }
        });

        console.log(`[getSalesRepsAction] Found ${grants.length} grants.`);

        const users = grants.map((g: any) => ({
            id: g.user.id,
            name: `${g.user.firstName} ${g.user.lastName}`
        }));

        return { success: true, users };
    } catch (e) {
        console.error("[getSalesRepsAction] Error:", e);
        return { success: false, users: [] };
    }
}

export async function getExamsAction(organisationId: string) {
    try {
        const exams = await (prisma as any).exam.findMany({
            where: { organisationId, isActive: true }
        });
        return { success: true, exams };
    } catch (e) {
        return { success: false, exams: [] };
    }
}

export async function getAgenciesAction(organisationId: string): Promise<{ success: boolean, agencies?: any[] }> {
    try {
        const agencies = await (prisma as any).agency.findMany({
            where: { organisationId, isActive: true }
        });
        return { success: true, agencies };
    } catch (error) {
        return { success: false, agencies: [] };
    }
}

export async function createManualLeadAction(leadData: Partial<Lead>, organizationId: string): Promise<{ success: boolean, lead?: Lead }> {
    try {
        // 1. Prepare Lead with Domain Logic (Scoring + Initial Status)
        const leadToInject = {
            ...leadData,
            organisationId: organizationId,
            createdAt: new Date(),
            updatedAt: new Date(),
            history: [],
            callAttempts: 0
        } as Lead;

        const processedLead = LeadService.injectLead(leadToInject);

        // 2. Automatic Distribution Trigger
        // If score is high (> 75) AND lead is not manually assigned
        if (processedLead.score > 75 && !processedLead.assignedUserId) {
            const autoUserId = await assignLeadRoundRobinHelper(organizationId, processedLead.agencyId);
            if (autoUserId) processedLead.assignedUserId = autoUserId;
        }

        // 3. Persist to DB
        const created: any = await (prisma as any).lead.create({
            data: {
                organisationId: organizationId,
                firstName: processedLead.firstName || 'Inconnu',
                lastName: processedLead.lastName || 'Inconnu',
                email: processedLead.email || '',
                phone: processedLead.phone || '',
                street: processedLead.street || '',
                zipCode: processedLead.zipCode || '',
                city: processedLead.city || '',
                source: processedLead.source || 'Manual',
                score: processedLead.score,
                status: processedLead.status,
                salesStage: processedLead.salesStage || null,
                assignedUserId: processedLead.assignedUserId,
                agencyId: processedLead.agencyId,
                callAttempts: processedLead.callAttempts,
                examId: processedLead.examId || undefined,
                touchpoints: {
                    create: processedLead.touchpoints?.map(tp => ({
                        type: tp.type,
                        source: tp.source,
                        medium: tp.medium,
                        campaign: tp.campaign,
                        referrer: tp.referrer,
                        pageUrl: tp.pageUrl,
                        createdAt: tp.createdAt
                    })) || []
                }
            }
        });

        revalidatePath('/app/crm');
        revalidatePath('/app/sales');

        return { success: true, lead: created };
    } catch (e) {
        console.error("Create Lead Error:", e);
        return { success: false };
    }
}

export async function refreshLeadScoreAction(leadId: string): Promise<{ success: boolean, newScore?: number }> {
    try {
        const lead = await (prisma as any).lead.findUnique({
            where: { id: leadId }
        });

        if (!lead) return { success: false };

        // Use central Domain Service for consistent scoring
        const score = LeadService.calculateScore(lead as Lead);

        await (prisma as any).lead.update({
            where: { id: leadId },
            data: { score }
        });

        revalidatePath('/app/crm');
        revalidatePath('/app/sales');

        return { success: true, newScore: score };
    } catch (e) {
        console.error("Refresh Lead Score Error:", e);
        return { success: false };
    }
}
export async function logCallAction(data: {
    leadId: string;
    duration: number;
    outcome: string;
    notes?: string;
    callerId: string;
    recordingUrl?: string;
}) {
    try {
        const call = await (prisma as any).call.create({
            data: {
                leadId: data.leadId,
                duration: data.duration,
                outcome: data.outcome,
                notes: data.notes,
                callerId: data.callerId,
                recordingUrl: data.recordingUrl
            }
        });

        // Also log as generic activity
        await (prisma as any).leadActivity.create({
            data: {
                leadId: data.leadId,
                type: 'CALL',
                content: `Appel sortant (${Math.floor(data.duration / 60)}m ${data.duration % 60}s) - Résultat: ${data.outcome}`,
                userId: data.callerId
            }
        });

        // Gamification Hook
        await GamificationService.trackActivity(data.callerId, GamificationActivity.CALL_MADE);

        return { success: true, call };
    } catch (error) {
        console.error("Log Call Error:", error);
        return { success: false };
    }
}

export async function logActivityAction(data: {
    leadId: string;
    userId: string;
    type: string;
    content: string;
    metadata?: any;
}) {
    try {
        await (prisma as any).leadActivity.create({
            data: {
                leadId: data.leadId,
                userId: data.userId,
                type: data.type,
                content: data.content,
                // metadata: data.metadata // Ensure schema supports this if needed, for now we can stringify if required
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Log Activity Error:", error);
        return { success: false };
    }
}
// ============================================
// MASS IMPORT (CSV)
// ============================================

export async function importLeadsAction(leads: any[], organisationId: string, mapping: any) {
    try {
        // 1. Validate inputs
        if (!leads || leads.length === 0) return { success: false, error: 'Aucune donnée à importer' };

        let successCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;
        const errors: any[] = [];

        // 2. Prepare standardized leads
        const leadsToProcess = leads.map((row, index) => {
            const email = row[mapping.email]?.trim();
            const phone = row[mapping.phone]?.replace(/\s/g, '').trim();

            if (!email && !phone) return null;

            const baseLead = {
                organisationId,
                firstName: row[mapping.firstName]?.trim() || 'Inconnu',
                lastName: row[mapping.lastName]?.trim() || '',
                email: email,
                phone: phone,
                source: mapping.defaultSource || 'IMPORT_CSV',
                campaignId: mapping.campaignId || undefined,
                agencyId: mapping.agencyId || undefined,
                examId: mapping.examId || undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
                callAttempts: 0,
                history: []
            } as any;

            // Apply Domain Logic (Scoring + Initial Status)
            return {
                ...LeadService.injectLead(baseLead),
                originalRow: index + 1
            };
        }).filter((l: any): l is NonNullable<typeof l> => l !== null);

        // [Auto-Assign Optimization] Pre-fetch candidates and their load
        let candidates: { userId: string, loadScore: number }[] = [];
        try {
            const grants = await (prisma as any).userAccessGrant.findMany({
                where: { organisationId },
                include: { user: true }
            });
            // Filter candidates if needed (e.g. only Agents)
            // For now take all users in org
            const users = grants.map((g: any) => g.user);

            candidates = await Promise.all(users.map(async (u: any) => {
                const count = await (prisma as any).lead.count({
                    where: {
                        assignedUserId: u.id,
                        status: { in: ['PROSPECT', 'PROSPECTION', 'ATTEMPTED', 'CONTACTED'] }
                    }
                });
                return { userId: u.id, loadScore: count };
            }));
        } catch (e) {
            console.warn("Auto-assign setup failed, continuing without assignment", e);
        }

        // 3. Process each lead
        for (const lead of leadsToProcess) {
            try {
                // Check duplicate (by email)
                if (lead.email) {
                    const existing = await (prisma as any).lead.findFirst({
                        where: { organisationId, email: lead.email }
                    });
                    if (existing) {
                        duplicateCount++;
                        continue;
                    }
                }

                // Automatic Distribution Trigger (only if score is high)
                if (lead.score > 75 && !lead.assignedUserId) {
                    const bestUserId = LeadService.getBestCandidate(candidates);
                    if (bestUserId) {
                        lead.assignedUserId = bestUserId;
                        // Update local load to maintain balance during this batch
                        const cand = candidates.find(c => c.userId === bestUserId);
                        if (cand) cand.loadScore++;
                    }
                }

                await (prisma as any).lead.create({
                    data: {
                        organisationId: lead.organisationId,
                        firstName: lead.firstName,
                        lastName: lead.lastName,
                        email: lead.email,
                        phone: lead.phone,
                        source: lead.source,
                        campaignId: lead.campaignId,
                        agencyId: lead.agencyId,
                        examId: lead.examId,
                        status: lead.status,
                        salesStage: lead.salesStage || null,
                        score: lead.score,
                        assignedUserId: lead.assignedUserId,
                        callAttempts: 0,
                        history: lead.history as any
                    }
                });
                successCount++;
            } catch (err) {
                console.error("Import Row Error:", err);
                errorCount++;
                errors.push({ row: lead.originalRow, error: 'Erreur d\'insertion' });
            }
        }

        return {
            success: true,
            stats: {
                processed: leads.length,
                imported: successCount,
                duplicates: duplicateCount,
                errors: errorCount
            }
        };

    } catch (error) {
        console.error('Import Leads Error:', error);
        return { success: false, error: 'Échec de l\'importation' };
    }
}

export async function getDailyUserPerformanceAction(userId: string) {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        const [callsConfig, meetingsConfig] = await Promise.all([
            (prisma as any).call.aggregate({
                where: {
                    callerId: userId,
                    createdAt: {
                        gte: startOfDay,
                        lt: endOfDay
                    }
                },
                _count: {
                    id: true,
                },
                _sum: {
                    duration: true
                }
            }),
            (prisma as any).call.count({
                where: {
                    callerId: userId,
                    outcome: 'APPOINTMENT_SET',
                    createdAt: {
                        gte: startOfDay,
                        lt: endOfDay
                    }
                }
            })
        ]);

        return {
            success: true,
            stats: {
                callsCount: callsConfig._count.id || 0,
                callsDuration: callsConfig._sum.duration || 0, // in seconds
                appointmentsCount: meetingsConfig || 0
            }
        };
    } catch (error) {
        console.error("Get Performance Error:", error);
        // Return zeros on error to avoid breaking UI
        return {
            success: false,
            stats: { callsCount: 0, callsDuration: 0, appointmentsCount: 0 }
        };
    }
}

async function assignLeadRoundRobinHelper(organisationId: string, agencyId?: string): Promise<string | null> {
    try {
        // [Dynamic Config] Get Agency Mode
        let mode: 'ROUND_ROBIN' | 'LOAD_BALANCED' | 'SKILL_BASED' = 'LOAD_BALANCED';
        if (agencyId) {
            const agency = await (prisma as any).agency.findUnique({ where: { id: agencyId } });
            if (agency?.distributionMode) mode = agency.distributionMode;
        }

        const grants = await (prisma as any).userAccessGrant.findMany({
            where: { organisationId },
            include: { user: true }
        });

        let candidates = grants.map((g: any) => g.user);

        // Filter by agency if possible
        if (agencyId) {
            candidates = candidates.filter((u: any) => !u.agencyId || u.agencyId === agencyId);
        }

        if (candidates.length === 0) return null;

        const candidatesWithScore = await Promise.all(candidates.map(async (u: any) => {
            let count = 0;

            if (mode === 'ROUND_ROBIN') {
                // Strategy: Count leads assigned TODAY to ensure rotation
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date();
                endOfDay.setHours(23, 59, 59, 999);

                count = await (prisma as any).lead.count({
                    where: {
                        assignedUserId: u.id,
                        createdAt: { gte: startOfDay, lte: endOfDay }
                    }
                });
            } else {
                // Strategy: LOAD_BALANCED (Default)
                count = await (prisma as any).lead.count({
                    where: {
                        assignedUserId: u.id,
                        status: { in: ['PROSPECT', 'PROSPECTION', 'ATTEMPTED', 'CONTACTED'] }
                    }
                });
            }
            return { userId: u.id, loadScore: count };
        }));

        return LeadService.getBestCandidate(candidatesWithScore, mode);

    } catch (e) {
        console.error("Auto-Assign Error:", e);
        return null;
    }
}

export async function getSourcePerformanceAction(organisationId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
        const stats = await prisma.lead.groupBy({
            by: ['source'],
            where: { organisationId },
            _count: { id: true },
            _avg: { score: true }
        });

        const convertedStats = await prisma.lead.groupBy({
            by: ['source'],
            where: {
                organisationId,
                status: { in: ['QUALIFIED', 'RDV_FIXE', 'SIGNED', 'CLIENT'] }
            },
            _count: { id: true }
        });

        const data = stats.map(stat => {
            const source = stat.source || 'Inconnu';
            const total = stat._count.id;
            const converted = convertedStats.find(c => c.source === stat.source)?._count.id || 0;
            const conversionRate = total > 0 ? (converted / total) * 100 : 0;

            return {
                source,
                leadsCount: total,
                avgScore: Math.round(stat._avg.score || 0),
                conversionRate: parseFloat(conversionRate.toFixed(1)),
                trend: 'stable' as const
            };
        });

        data.sort((a, b) => b.leadsCount - a.leadsCount);

        return { success: true, data };
    } catch (e) {
        console.error("Source Performance Error:", e);
        return { success: false, error: "Erreur lors du chargement des statistiques source" };
    }
}

export async function getLeadTouchpointsAction(leadId: string): Promise<{ success: boolean; touchpoints?: any[]; error?: string }> {
    try {
        const touchpoints = await (prisma as any).leadTouchpoint.findMany({
            where: { leadId },
            orderBy: { createdAt: 'asc' }
        });
        return { success: true, touchpoints };
    } catch (e: any) {
        console.error("Get Lead Touchpoints Error:", e);
        return { success: false, error: e.message || "Failed to fetch touchpoints" };
    }
}
