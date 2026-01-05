'use server';

import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export async function getFranchiseBillingSummaryAction(
    organisationId: string,
    month: number,
    year: number
) {
    try {
        const startDate = startOfMonth(new Date(year, month));
        const endDate = endOfMonth(new Date(year, month));

        // 1. Get all franchises
        const franchises = await (prisma as any).franchise.findMany({
            where: { organisationId },
            include: {
                agencies: {
                    select: { id: true, name: true }
                }
            }
        });

        const billingData = await Promise.all(franchises.map(async (f: any) => {
            const agencyIds = f.agencies.map((a: any) => a.id);

            // 2. Count Leads for this franchise in period
            const leadCount = await (prisma as any).lead.count({
                where: {
                    agencyId: { in: agencyIds },
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });

            // 3. Calculate Turnover from Trainings in period
            // We look at LearnerFolders created in agencies of this franchise
            const folders = await (prisma as any).learnerFolder.findMany({
                where: {
                    learner: {
                        agencyId: { in: agencyIds }
                    },
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                include: {
                    training: {
                        select: { priceHt: true }
                    }
                }
            });

            const turnoverHt = folders.reduce((sum: number, folder: any) => {
                return sum + (folder.training?.priceHt || 0);
            }, 0);

            const royaltiesAmount = (turnoverHt * (f.royaltyRate || 0)) / 100;
            const leadsAmount = leadCount * (f.leadPrice || 0);
            const totalToInvoice = royaltiesAmount + leadsAmount;

            return {
                franchiseId: f.id,
                franchiseName: f.name,
                siret: f.siret,
                leadCount,
                leadPrice: f.leadPrice,
                leadsAmount,
                turnoverHt,
                royaltyRate: f.royaltyRate,
                royaltiesAmount,
                totalToInvoice,
                currency: 'EUR'
            };
        }));

        return { success: true, billingData, period: { startDate, endDate } };
    } catch (error) {
        console.error("Billing Summary Error:", error);
        return { success: false, error: "Failed to calculate billing summary" };
    }
}
