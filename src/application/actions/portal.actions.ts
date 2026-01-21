'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ============================================
// PORTAL: B2B CLIENT MANAGEMENT
// ============================================

export async function createClientCompanyAction(data: {
    organisationId: string;
    name: string;
    siret?: string;
    address?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
}) {
    try {
        const portalCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        const company = await (prisma as any).clientCompany.create({
            data: {
                organisationId: data.organisationId,
                name: data.name,
                siret: data.siret,
                address: data.address,
                contactName: data.contactName,
                contactEmail: data.contactEmail,
                contactPhone: data.contactPhone,
                portalCode
            }
        });

        revalidatePath('/app/network');
        return { success: true, company };
    } catch (error) {
        console.error("Create Client Company Error:", error);
        return { success: false, error: "Erreur lors de la création de l'entreprise cliente" };
    }
}

export async function getClientCompaniesAction(organisationId: string) {
    try {
        const companies = await (prisma as any).clientCompany.findMany({
            where: { organisationId },
            include: {
                learners: {
                    select: { id: true }
                },
                users: {
                    select: { id: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Add counts
        const formatted = companies.map((c: any) => ({
            ...c,
            learnersCount: c.learners.length,
            usersCount: c.users.length
        }));

        return { success: true, companies: formatted };
    } catch (error) {
        console.error("Get Client Companies Error:", error);
        return { success: false, error: "Erreur lors de la récupération des entreprises" };
    }
}

// ============================================
// PORTAL: DATA ACCESS (For Client Users)
// ============================================

export async function getClientPortalDashboardAction(clientCompanyId: string) {
    try {
        // 1. Fetch Company Info
        const company = await (prisma as any).clientCompany.findUnique({
            where: { id: clientCompanyId }
        });

        // 2. Fetch Employees (Learners) Stats
        const learners = await (prisma as any).learner.findMany({
            where: { clientCompanyId },
            include: {
                folders: true
            }
        });

        const totalLearners = learners.length;
        const activeLearners = learners.filter((l: any) =>
            l.folders.some((f: any) => f.status === 'IN_TRAINING' || f.status === 'ONBOARDING')
        ).length;

        let totalHours = 0;
        let completedTrainings = 0;

        learners.forEach((l: any) => {
            l.folders.forEach((f: any) => {
                totalHours += f.hoursUsed || 0;
                if (f.status === 'COMPLETED') completedTrainings++;
            });
        });

        // 3. Fetch Invoices Stats
        const invoices = await (prisma as any).invoice.findMany({
            where: { clientCompanyId }
        });

        const totalBilled = invoices.reduce((sum: number, i: any) => sum + i.totalAmount, 0);
        const totalPaid = invoices.filter((i: any) => i.status === 'PAID').reduce((sum: number, i: any) => sum + i.totalAmount, 0);

        return {
            success: true,
            dashboard: {
                company,
                stats: {
                    totalLearners,
                    activeLearners,
                    completedTrainings,
                    totalHours,
                    totalBilled,
                    totalPaid,
                    dueAmount: totalBilled - totalPaid
                }
            }
        };

    } catch (error) {
        console.error("Portal Dashboard Error:", error);
        return { success: false, error: "Erreur de chargement du portail" };
    }
}

export async function getClientEmployeesAction(clientCompanyId: string) {
    try {
        const employees = await (prisma as any).learner.findMany({
            where: { clientCompanyId },
            include: {
                folders: {
                    where: { status: { not: 'DROPPED' } },
                    include: { training: true },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { lastName: 'asc' }
        });

        // Format for table
        const formatted = employees.map((e: any) => ({
            id: e.id,
            name: `${e.firstName} ${e.lastName}`,
            email: e.email,
            currentTraining: e.folders[0]?.trainingTitle || e.folders[0]?.training?.title || 'Aucune formation',
            status: e.folders[0]?.status || 'INACTIVE',
            progress: e.folders[0]?.trainingDuration ? Math.round(((e.folders[0].hoursUsed || 0) / e.folders[0].trainingDuration) * 100) : 0,
            lastActivity: e.folders[0]?.updatedAt
        }));

        return { success: true, employees: formatted };
    } catch (error) {
        console.error("Portal Employees Error:", error);
        return { success: false, error: "Erreur lors de la récupération des collaborateurs" };
    }
}

export async function getClientInvoicesAction(clientCompanyId: string) {
    try {
        const invoices = await (prisma as any).invoice.findMany({
            where: { clientCompanyId },
            orderBy: { date: 'desc' },
            include: { payments: true }
        });

        return { success: true, invoices };
    } catch (error) {
        console.error("Portal Invoices Error:", error);
        return { success: false, error: "Erreur lors de la récupération des factures" };
    }
}
