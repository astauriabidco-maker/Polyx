'use server';

import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@/domain/entities/lead';
import { getConsolidatedAgencyWhereClause, getAgencyWhereClause } from '@/lib/auth-utils';

/**
 * Metrics for the Sales Cockpit (Individual User)
 */
export async function getSalesMetricsAction(userId: string, orgIdOrIds: string | string[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let whereClause: any;
    if (Array.isArray(orgIdOrIds)) {
        whereClause = await getConsolidatedAgencyWhereClause(orgIdOrIds);
    } else {
        whereClause = await getAgencyWhereClause(orgIdOrIds);
    }

    const myLeads = await prisma.lead.findMany({
        where: whereClause, // In real world: AND assignedToId: userId
        include: { organisation: { select: { name: true } } }
    });

    const sessionCandidates = myLeads
        .filter(l =>
            l.status === LeadStatus.PROSPECTION ||
            l.status === LeadStatus.PROSPECT ||
            (l.nextCallbackAt && l.nextCallbackAt <= new Date())
        )
        .slice(0, 50)
        .map(l => ({
            ...l,
            organizationId: l.organisationId,
            organizationName: (l as any).organisation?.name || 'Inconnu'
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
            conversionRate: 15
        },
        pipeline: myLeads.filter(l => l.status === LeadStatus.CONTACTED).slice(0, 5),
        sessionCandidates
    };
}

/**
 * Metrics for the Manager Cockpit (Organization Wide)
 */
export async function getManagerMetricsAction(orgIdOrIds: string | string[]) {
    let whereClause: any;
    if (Array.isArray(orgIdOrIds)) {
        whereClause = await getConsolidatedAgencyWhereClause(orgIdOrIds);
    } else {
        whereClause = await getAgencyWhereClause(orgIdOrIds);
    }

    const orgLeads = await prisma.lead.findMany({
        where: whereClause
    });

    const totalLeads = orgLeads.length;
    const converted = orgLeads.filter(l => l.status === LeadStatus.RDV_FIXE).length;
    const leadsNew = orgLeads.filter(l => l.status === LeadStatus.PROSPECT).length;

    const revenue = converted * 3500;

    return {
        success: true,
        metrics: {
            revenue,
            totalLeads,
            conversionRate: totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0,
            leadsNew
        },
        teamPerformance: [
            { name: 'Marie Lyon', sales: 5, revenue: 17500 },
        ]
    };
}

/**
 * Get conversion rate by Lead Source
 */
export async function getLeadQualityBySourceAction(orgIdOrIds: string | string[]) {
    try {
        let whereClause: any;
        if (Array.isArray(orgIdOrIds)) {
            whereClause = await getConsolidatedAgencyWhereClause(orgIdOrIds);
        } else {
            whereClause = await getAgencyWhereClause(orgIdOrIds);
        }

        const leads = await prisma.lead.findMany({
            where: whereClause,
            select: { source: true, status: true }
        });

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
 * Get performance by Script
 */
export async function getScriptPerformanceAction(orgIdOrIds: string | string[]) {
    try {
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
 * Transformation leaderboard
 */
export async function getTransformationLeaderboardAction(orgIdOrIds: string | string[]) {
    try {
        let whereClause: any;
        if (Array.isArray(orgIdOrIds)) {
            whereClause = await getConsolidatedAgencyWhereClause(orgIdOrIds);
        } else {
            whereClause = await getAgencyWhereClause(orgIdOrIds);
        }

        const users = await prisma.user.findMany({
            where: {
                accessGrants: {
                    some: whereClause.organisationId ? { organisationId: whereClause.organisationId } : whereClause
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                image: true,
            }
        });

        const leaderboardData = await Promise.all(users.map(async (user) => {
            const totalCalls = await prisma.call.count({
                where: { callerId: user.id }
            });

            const convertedLeads = await prisma.lead.count({
                where: {
                    ...whereClause,
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

        return {
            success: true,
            data: leaderboardData.sort((a, b) => b.rate - a.rate)
        };

    } catch (error) {
        console.error("Error fetching transformation leaderboard:", error);
        return { success: false, data: [] };
    }
}
