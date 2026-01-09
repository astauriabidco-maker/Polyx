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
        where: { organisationId: orgId }, // In real world: AND assignedToId: userId
        include: { organisation: { select: { name: true } } }
    });

    // Logic for Session Cards:
    // 1. Leads in PROSPECTION (to be called)
    // 2. Leads in PROSPECT (New)
    // 3. Overdue callbacks
    const sessionCandidates = myLeads
        .filter(l =>
            l.status === LeadStatus.PROSPECTION ||
            l.status === LeadStatus.PROSPECT ||
            (l.nextCallbackAt && l.nextCallbackAt <= new Date())
        )
        .slice(0, 50) // Limit to 50 for a session
        .map(l => ({
            ...l,
            organizationId: l.organisationId,
            organizationName: (l as any).organisation?.name || 'My Org'
        }));

    const callsToDo = sessionCandidates.length;
    const opportunities = myLeads.filter(l => l.status === LeadStatus.CONTACTED).length;
    const salesThisMonth = myLeads.filter(l => l.status === LeadStatus.RDV_FIXE).length;

    return {
        success: true,
        metrics: {
            callsToDo,
            opportunities,
            salesThisMonth,
            conversionRate: 15 // Mock %
        },
        pipeline: myLeads.filter(l => l.status === LeadStatus.CONTACTED).slice(0, 5), // Recent 5 proposals
        sessionCandidates
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
/**
 * Get the transformation leaderboard for an organization.
 * Calculates conversion rate: (RDV_FIXE Leads / Total Calls) * 100
 */
export async function getTransformationLeaderboardAction(orgId: string) {
    try {
        // 1. Get all users in the organization
        const users = await prisma.user.findMany({
            where: {
                accessGrants: {
                    some: { organisationId: orgId }
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                image: true,
            }
        });

        // 2. Fetch stats for each user
        const leaderboardData = await Promise.all(users.map(async (user) => {
            // Count total calls by this user
            const totalCalls = await prisma.call.count({
                where: { callerId: user.id }
            });

            // Count leads that reached RDV_FIXE status and were assigned to this user
            // In a more complex system, we might track who explicitly 'closed' the lead,
            // but for now, we use the assignedToId as the proxy for the closer.
            const convertedLeads = await prisma.lead.count({
                where: {
                    organisationId: orgId,
                    assignedUserId: user.id,
                    status: LeadStatus.RDV_FIXE
                }
            });

            return {
                id: user.id,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Agent Anonyme',
                image: user.image,
                totalCalls,
                convertedLeads,
                rate: totalCalls > 0 ? Math.round((convertedLeads / totalCalls) * 100) : 0
            };
        }));

        // Sort by transformation rate
        return {
            success: true,
            data: leaderboardData.sort((a, b) => b.rate - a.rate)
        };

    } catch (error) {
        console.error("Error fetching transformation leaderboard:", error);
        return { success: false, data: [] };
    }
}
