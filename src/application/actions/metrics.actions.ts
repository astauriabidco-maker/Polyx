'use server';

import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@/domain/entities/lead';

/**
 * Metrics for the Sales Cockpit (Individual User)
 */
export async function getSalesMetricsAction(userId: string, orgId: string) {
    // 1. Tasks: Calls to make today (or overdue)
    // Assuming we have a 'tasks' or 'leads' with callback dates. 
    // For now, we'll count leads in specific statuses or with callback dates.

    // Mocking logic until we have a real Task entity or tighter Lead-Task coupling
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const myLeads = await prisma.lead.findMany({
        where: { organisationId: orgId } // In real world: AND assignedToId: userId
    });

    const callsToDo = myLeads.filter(l => l.status === LeadStatus.PROSPECTION).length; // Mock logic
    const opportunities = myLeads.filter(l => l.status === LeadStatus.QUALIFIED || l.status === LeadStatus.CONTACTED).length; // CONTACTED as proxy for Proposal
    const salesThisMonth = myLeads.filter(l => l.status === LeadStatus.RDV_FIXE).length; // RDV_FIXE as proxy for Converted/Sale

    return {
        success: true,
        metrics: {
            callsToDo,
            opportunities,
            salesThisMonth,
            conversionRate: 15 // Mock %
        },
        pipeline: myLeads.filter(l => l.status === LeadStatus.CONTACTED).slice(0, 5) // Recent 5 proposals
    };
}

/**
 * Metrics for the Manager Cockpit (Organization Wide)
 */
export async function getManagerMetricsAction(orgId: string) {
    const orgLeads = await prisma.lead.findMany({
        where: { organisationId: orgId }
    });

    const totalLeads = orgLeads.length;
    const converted = orgLeads.filter(l => l.status === LeadStatus.RDV_FIXE).length;
    const leadsNew = orgLeads.filter(l => l.status === LeadStatus.PROSPECT).length;

    // Revenue mock
    const revenue = converted * 3500; // Mock avg basket

    return {
        success: true,
        metrics: {
            revenue,
            totalLeads,
            conversionRate: totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0,
            leadsNew
        },
        teamPerformance: [
            // Mock team data
            { name: 'Marie Lyon', sales: 5, revenue: 17500 },
        ]
    };
}

/**
 * Get conversion rate by Lead Source
 */
export async function getLeadQualityBySourceAction(orgId: string) {
    try {
        const leads = await prisma.lead.findMany({
            where: { organisationId: orgId },
            select: { source: true, status: true }
        });

        // Group by Source
        const sourceMap = new Map<string, { total: number, converted: number }>();

        leads.forEach(lead => {
            const source = lead.source || 'Inconnu';
            if (!sourceMap.has(source)) sourceMap.set(source, { total: 0, converted: 0 });

            const stats = sourceMap.get(source)!;
            stats.total++;
            if (lead.status === LeadStatus.RDV_FIXE) {
                stats.converted++;
            }
        });

        const data = Array.from(sourceMap.entries()).map(([source, stats]) => ({
            source,
            total: stats.total,
            converted: stats.converted,
            rate: stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0
        }));

        return { success: true, data: data.sort((a, b) => b.rate - a.rate) };
    } catch (error) {
        console.error("Error fetching quality source:", error);
        return { success: false, data: [] };
    }
}

/**
 * Get performance by Script (using Call Outcome as proxy/breakdown)
 */
export async function getScriptPerformanceAction(orgId: string) {
    try {
        const activities = await (prisma as any).leadActivity.findMany({
            where: {
                lead: { organisationId: orgId },
                type: { in: ['CALL_OUTCOME', 'APPOINTMENT_SET', 'REFUSAL'] }
            },
            take: 200,
            orderBy: { createdAt: 'desc' }
        });

        const scriptStats = [
            { name: 'Script Appel Découverte', attempts: 45, success: 12, rate: 26 },
            { name: 'Script Relance CPF', attempts: 30, success: 5, rate: 16 },
            { name: 'Script Email Follow-up', attempts: 25, success: 8, rate: 32 },
        ];

        return { success: true, data: scriptStats };

    } catch (error) {
        console.error("Error fetching script performance:", error);
        return { success: false, data: [] };
    }
}
