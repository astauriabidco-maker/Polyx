'use server';

import { db } from '@/infrastructure/mock-db';
import { LeadStatus } from '@/domain/entities/lead';

export interface OrgStats {
    id: string;
    name: string;
    leadCount: number;
    turnover: number;
    healthScore: number; // 0-100
}

export interface NetworkStats {
    totalLeads: number;
    activeLeads: number;
    totalTurnover: number;
    activeAgents: number;
    organizations: OrgStats[];
}

export async function getNetworkStatsAction(): Promise<{ success: boolean, stats?: NetworkStats, error?: string }> {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        const organizations = db.organizations;
        const leads = db.leads;
        const users = db.users;

        let totalTurnover = 0;

        const orgStats: OrgStats[] = organizations.map(org => {
            const orgLeads = leads.filter(l => l.organizationId === org.id);
            const leadCount = orgLeads.length;

            // Mock turnover calculation: Qualified leads * avg value (e.g. 1500€)
            const qualifiedCount = orgLeads.filter(l => l.status === LeadStatus.QUALIFIED).length;
            const turnover = qualifiedCount * 1500;
            totalTurnover += turnover;

            // Mock Health Score (randomized for demo or based on conversion rate)
            // Logic: Base 60 + Conversion Rate bonus
            const conversionRate = leadCount > 0 ? (qualifiedCount / leadCount) * 100 : 0;
            const healthScore = Math.min(100, Math.round(60 + conversionRate * 2));

            return {
                id: org.id,
                name: org.name,
                leadCount,
                turnover,
                healthScore
            };
        });

        const stats: NetworkStats = {
            totalLeads: leads.length,
            activeLeads: leads.filter(l => l.status !== LeadStatus.ARCHIVED && l.status !== LeadStatus.DISQUALIFIED).length,
            totalTurnover,
            activeAgents: users.length,
            organizations: orgStats
        };

        return { success: true, stats };
    } catch (error) {
        console.error('Network Stats Error:', error);
        return { success: false, error: 'Failed to fetch network stats' };
    }
}
