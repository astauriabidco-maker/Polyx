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

    const callsToDo = myLeads.filter(l => l.status === LeadStatus.TO_CONTACT).length; // Mock logic
    const opportunities = myLeads.filter(l => l.status === LeadStatus.QUALIFIED || l.status === LeadStatus.PROPOSAL_SENT).length;
    const salesThisMonth = myLeads.filter(l => l.status === LeadStatus.CONVERTED).length; // Mock, needs date filter

    return {
        success: true,
        metrics: {
            callsToDo,
            opportunities,
            salesThisMonth,
            conversionRate: 15 // Mock %
        },
        pipeline: myLeads.filter(l => l.status === LeadStatus.PROPOSAL_SENT).slice(0, 5) // Recent 5 proposals
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
    const converted = orgLeads.filter(l => l.status === LeadStatus.CONVERTED).length;
    const leadsNew = orgLeads.filter(l => l.status === LeadStatus.NEW).length;

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
            { name: 'Sarah Connor', sales: 12, revenue: 42000 },
            { name: 'John Doe', sales: 8, revenue: 28000 },
            { name: 'Marie Lyon', sales: 5, revenue: 17500 },
        ]
    };
}
