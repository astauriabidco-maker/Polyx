'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Fetches all marketing campaigns for an organisation with calculated KPIs.
 */
export async function getCampaignsAction(organisationId: string) {
    console.log("[MarketingAction] Fetching campaigns for:", organisationId);
    try {
        if (!organisationId) throw new Error("Organisation ID missing");

        const campaigns = await (prisma as any).marketingCampaign.findMany({
            where: { organisationId },
            include: {
                leads: {
                    select: {
                        id: true,
                        status: true,
                        closingData: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`[MarketingAction] Found ${campaigns.length} campaigns`);

        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId }
        });

        const avgCartValue = config?.averageCartValue || 1500;

        const enhancedCampaigns = campaigns.map((campaign: any) => {
            const leads = campaign.leads || [];
            const leadsCount = leads.length;

            const convertedLeads = leads.filter((l: any) =>
                ['SIGNED', 'CLIENT', 'RDV_FIXE', 'INSCRIT_CPF', 'INSCRIT_PERSO'].includes(l.status)
            );

            const conversionsCount = convertedLeads.length;
            const conversionRate = leadsCount > 0 ? (conversionsCount / leadsCount) * 100 : 0;

            const totalValue = convertedLeads.reduce((acc: number, lead: any) => {
                const closingData = lead.closingData as any;
                return acc + (closingData?.trainingPriceHt || avgCartValue);
            }, 0);

            const roas = campaign.spent > 0 ? totalValue / campaign.spent : 0;

            return {
                ...campaign,
                leadsCount,
                conversionsCount,
                conversionRate: parseFloat(conversionRate.toFixed(1)),
                roas: parseFloat(roas.toFixed(2)),
                estimatedRevenue: totalValue
            };
        });

        return { success: true, campaigns: enhancedCampaigns };
    } catch (error: any) {
        console.error("[MarketingAction] Get Campaigns Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Creates a new marketing campaign.
 */
export async function createCampaignAction(data: {
    organisationId: string,
    name: string,
    description?: string,
    type: string,
    budget: number,
    spent?: number,
    startDate?: Date,
    endDate?: Date,
    sequenceId?: string
}) {
    try {
        const campaign = await (prisma as any).marketingCampaign.create({
            data: {
                organisationId: data.organisationId,
                name: data.name,
                description: data.description,
                type: data.type,
                budget: data.budget,
                spent: data.spent || 0,
                startDate: data.startDate,
                endDate: data.endDate,
                sequenceId: data.sequenceId || null,
            }
        });

        revalidatePath('/app/leads');
        return { success: true, campaign };
    } catch (error: any) {
        console.error("Create Campaign Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Updates an existing campaign (budget, spent, status).
 */
export async function updateCampaignAction(campaignId: string, data: any) {
    try {
        const updated = await (prisma as any).marketingCampaign.update({
            where: { id: campaignId },
            data
        });

        revalidatePath('/app/leads');
        return { success: true, campaign: updated };
    } catch (error: any) {
        console.error("Update Campaign Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Deletes a campaign.
 */
export async function deleteCampaignAction(campaignId: string) {
    try {
        await (prisma as any).marketingCampaign.delete({
            where: { id: campaignId }
        });

        revalidatePath('/app/leads');
        return { success: true };
    } catch (error: any) {
        console.error("Delete Campaign Error:", error);
        return { success: false, error: error.message };
    }
}
