'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function getAssessmentsListAction(
    orgId: string,
    filters?: { status?: string; level?: string; search?: string }
) {
    try {
        const where: Prisma.AssessmentSessionWhereInput = {
            lead: {
                organizationId: orgId
            }
        };

        // Filters
        if (filters?.status && filters.status !== 'ALL') {
            where.status = filters.status as any;
        }

        if (filters?.level && filters.level !== 'ALL') {
            where.targetLevel = filters.level as any;
        }

        if (filters?.search) {
            where.lead = {
                ...where.lead,
                OR: [
                    { firstName: { contains: filters.search } },
                    { lastName: { contains: filters.search } },
                    { email: { contains: filters.search } }
                ]
            };
        }

        // Fetch Data
        const assessments = await prisma.assessmentSession.findMany({
            where,
            include: {
                lead: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // KPIs Aggregation
        const totalTests = assessments.length;
        const pendingCount = assessments.filter(a => a.status === 'PENDING').length;
        const completedCount = assessments.filter(a => a.status === 'COMPLETED').length;
        // Ensure recommendedHours is treated as 0 if null
        const potentialHours = assessments.reduce((acc, curr) => acc + (curr.recommendedHours || 0), 0);

        return {
            success: true,
            data: {
                assessments,
                stats: {
                    totalTests,
                    pendingCount,
                    completedCount,
                    potentialHours
                }
            }
        };

    } catch (error) {
        console.error('Error fetching assessments list:', error);
        return { success: false, error: 'Failed to fetch assessments' };
    }
}
