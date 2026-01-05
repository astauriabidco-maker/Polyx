'use server';

import { prisma } from '@/lib/prisma';
import { Lead, LeadWithOrg, LeadStatus, SalesStage } from '@/domain/entities/lead';
import { getAgencyWhereClause } from '@/lib/auth-utils';

// Mimics a real DB query with latency
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function getLeadsAction(organizationId: string, isUnified: boolean = false, agencyId?: string): Promise<{ success: boolean, leads?: LeadWithOrg[], error?: string }> {
    try {
        let resultLeads: any[] = [];

        const whereClause = await getAgencyWhereClause(organizationId, agencyId);

        if (isUnified) {
            resultLeads = await (prisma as any).lead.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                include: { organisation: true }
            });
        } else {
            resultLeads = await (prisma as any).lead.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                include: { organisation: true }
            });
        }

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

export async function updateLeadAction(leadId: string, data: Partial<Lead>): Promise<{ success: boolean, lead?: Lead }> {
    try {
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
            }
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
    } catch (e) {
        console.error("Update Lead Error:", e);
        return { success: false };
    }
}

export async function getSalesRepsAction(organisationId: string): Promise<{ success: boolean, users: { id: string, name: string }[] }> {
    try {
        const grants = await (prisma as any).userAccessGrant.findMany({
            where: { organisationId },
            include: { user: true }
        });

        const users = grants.map((g: any) => ({
            id: g.user.id,
            name: `${g.user.firstName} ${g.user.lastName}`
        }));

        return { success: true, users };
    } catch (e) {
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
        const created: any = await (prisma as any).lead.create({
            data: {
                organisationId: organizationId,
                firstName: leadData.firstName || 'Inconnu',
                lastName: leadData.lastName || 'Inconnu',
                email: leadData.email || '',
                phone: leadData.phone || '',
                street: leadData.street || '',
                zipCode: leadData.zipCode || '',
                city: leadData.city || '',
                status: LeadStatus.PROSPECT,
                salesStage: SalesStage.NOUVEAU,

                source: leadData.source as string, // Cast Enum

                // Handle IDs safely
                agencyId: leadData.agencyId || undefined,
                examId: leadData.examId || undefined,
            }
        });

        const mapped: Lead = {
            id: created.id,
            organizationId: created.organisationId,
            firstName: created.firstName,
            lastName: created.lastName,
            email: created.email,
            phone: created.phone,
            status: created.status as LeadStatus,
            salesStage: created.salesStage as SalesStage,
            history: [],
            score: created.score,
            source: created.source || 'autre',
            callAttempts: created.callAttempts || 0,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt
        };

        return { success: true, lead: mapped };
    } catch (e) {
        console.error("Create Lead Error:", e);
        return { success: false };
    }
}

export async function refreshLeadScoreAction(leadId: string): Promise<{ success: boolean, newScore?: number }> {
    try {
        // Fetch lead data for scoring
        const lead = await (prisma as any).lead.findUnique({
            where: { id: leadId }
        });

        if (!lead) return { success: false };

        // Simple scoring algorithm based on lead data completeness
        let score = 50; // Base score

        // Boost for complete contact info
        if (lead.email && lead.email.length > 0) score += 10;
        if (lead.phone && lead.phone.length > 0) score += 10;

        // Boost for address info
        if (lead.city) score += 5;
        if (lead.zipCode) score += 5;

        // Boost for engagement
        if (lead.callAttempts > 0 && lead.callAttempts < 3) score += 10;
        if (lead.status === 'CONTACTED' || lead.status === 'QUALIFIED') score += 15;

        // Penalty for too many attempts without result
        if (lead.callAttempts >= 5 && lead.status === 'PROSPECT') score -= 15;

        // Clamp score between 0 and 100
        score = Math.max(0, Math.min(100, score));

        // Update lead with new score
        await (prisma as any).lead.update({
            where: { id: leadId },
            data: { score }
        });

        return { success: true, newScore: score };
    } catch (e) {
        console.error("Refresh Lead Score Error:", e);
        return { success: false };
    }
}
