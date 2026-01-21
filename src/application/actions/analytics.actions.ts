'use server';

import { prisma } from '@/lib/prisma';
import { checkAgencyAccess } from '@/lib/auth-utils';

export async function getAgencyPerformanceStatsAction(organisationId: string) {
    try {
        const access = await checkAgencyAccess(organisationId);
        if (!access.success) return { success: false, error: access.error };

        // 1. Get all agencies
        const agencies = await (prisma as any).agency.findMany({
            where: {
                organisationId,
                id: access.isFullAdmin ? undefined : { in: access.assignedAgencyIds }
            },
            select: { id: true, name: true }
        });

        // 2. Fetch leads per agency
        const stats = await Promise.all(agencies.map(async (agency: any) => {
            const leadCount = await (prisma as any).lead.count({
                where: { agencyId: agency.id }
            });

            const qualifiedCount = await (prisma as any).lead.count({
                where: { agencyId: agency.id, status: 'QUALIFIED' }
            });

            // Mock revenue/value based on qualified leads
            const potentialValue = qualifiedCount * 1500;

            const conversionRate = leadCount > 0 ? Math.round((qualifiedCount / leadCount) * 100) : 0;

            return {
                agencyId: agency.id,
                agencyName: agency.name,
                totalLeads: leadCount,
                qualifiedLeads: qualifiedCount,
                potentialValue,
                conversionRate
            };
        }));

        return { success: true, stats };
    } catch (error) {
        console.error("Get Agency Stats Error:", error);
        return { success: false, error: "Failed to fetch agency stats" };
    }
}
