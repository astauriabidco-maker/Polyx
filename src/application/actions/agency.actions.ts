'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { checkAgencyAccess } from '@/lib/auth-utils';

export async function getAgenciesAction(organisationId: string) {
    try {
        const access = await checkAgencyAccess(organisationId);
        if (!access.success) return { success: false, error: access.error };

        const where: any = { organisationId };
        if (!access.isFullAdmin && access.assignedAgencyIds) {
            where.id = { in: access.assignedAgencyIds };
        }

        const agencies = await (prisma as any).agency.findMany({
            where,
            include: {
                franchise: { select: { id: true, name: true } }
            },
            orderBy: { name: 'asc' }
        });
        return { success: true, agencies };
    } catch (error) {
        console.error("Get Agencies Error:", error);
        return { success: false, error: "Failed to fetch agencies" };
    }
}

export async function createAgencyAction(organisationId: string, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const code = formData.get('code') as string;
        const managerName = formData.get('managerName') as string;
        const street = formData.get('street') as string;
        const city = formData.get('city') as string;
        const zipCode = formData.get('zipCode') as string;
        const phone = formData.get('phone') as string;
        const email = formData.get('email') as string;
        const franchiseId = formData.get('franchiseId') as string;

        const agency = await (prisma as any).agency.create({
            data: {
                organisationId,
                franchiseId: franchiseId === "none" ? null : franchiseId,
                name,
                code,
                managerName,
                street,
                city,
                zipCode,
                phone,
                email,
                isActive: true,
                isExamCenter: formData.get('isExamCenter') === 'on'
            }
        });
        revalidatePath('/app/settings/structure');
        return { success: true, agency };
    } catch (error) {
        console.error("Create Agency Error:", error);
        return { success: false, error: "Failed to create agency" };
    }
}

export async function updateAgencyAction(organisationId: string, agencyId: string, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const code = formData.get('code') as string;
        const managerName = formData.get('managerName') as string;
        const street = formData.get('street') as string;
        const city = formData.get('city') as string;
        const zipCode = formData.get('zipCode') as string;
        const phone = formData.get('phone') as string;
        const email = formData.get('email') as string;
        const franchiseId = formData.get('franchiseId') as string;

        const agency = await (prisma as any).agency.update({
            where: { id: agencyId },
            data: {
                name,
                code,
                managerName,
                street,
                city,
                zipCode,
                phone,
                email,
                franchiseId: franchiseId === "none" ? null : franchiseId,
                isExamCenter: formData.get('isExamCenter') === 'on'
            }
        });
        revalidatePath('/app/settings/structure');
        return { success: true, agency };
    } catch (error) {
        console.error("Update Agency Error:", error);
        return { success: false, error: "Failed to update agency" };
    }
}

export async function deleteAgencyAction(organisationId: string, agencyId: string) {
    try {
        await (prisma as any).agency.delete({
            where: { id: agencyId }
        });
        revalidatePath('/app/settings/structure');
        return { success: true };
    } catch (error) {
        console.error("Delete Agency Error:", error);
        return { success: false, error: "Failed to delete agency" };
    }
}

export async function getUserAgenciesAction(userId: string) {
    try {
        const userAgencies = await (prisma as any).userAgency.findMany({
            where: { userId },
            include: { agency: true }
        });
        return { success: true, agencies: userAgencies.map((ua: any) => ua.agency) };
    } catch (error) {
        console.error("Get User Agencies Error:", error);
        return { success: false, error: "Failed to fetch user agencies" };
    }
}

export async function assignUserToAgencyAction(userId: string, agencyId: string) {
    try {
        const assignment = await (prisma as any).userAgency.create({
            data: { userId, agencyId }
        });
        return { success: true, assignment };
    } catch (error) {
        console.error("Assign User Agency Error:", error);
        return { success: false, error: "Failed to assign user to agency" };
    }
}

export async function removeUserFromAgencyAction(userId: string, agencyId: string) {
    try {
        await (prisma as any).userAgency.delete({
            where: {
                userId_agencyId: { userId, agencyId }
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Remove User Agency Error:", error);
        return { success: false, error: "Failed to remove user from agency" };
    }
}
