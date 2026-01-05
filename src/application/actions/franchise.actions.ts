'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-utils";

// --- FRANCHISE CRUD ---

export async function getFranchisesAction(organisationId: string) {
    try {
        const franchises = await (prisma as any).franchise.findMany({
            where: { organisationId },
            include: {
                agencies: { select: { id: true, name: true, city: true } },
                users: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } }
            },
            orderBy: { name: 'asc' }
        });
        return { success: true, franchises };
    } catch (error) {
        console.error("Get Franchises Error:", error);
        return { success: false, error: "Failed to fetch franchises" };
    }
}

export async function createFranchiseAction(data: {
    organisationId: string;
    name: string;
    siret?: string;
    managerName?: string;
    email?: string;
    phone?: string;
    street?: string;
    city?: string;
    zipCode?: string;
    contractStatus?: string;
    contractStartDate?: Date | null;
    contractEndDate?: Date | null;
    signatureDate?: Date | null;
    dipSentDate?: Date | null;
    royaltyRate?: number;
    leadPrice?: number;
    notes?: string;
}) {
    try {
        const franchise = await (prisma as any).franchise.create({
            data: {
                organisationId: data.organisationId,
                name: data.name,
                siret: data.siret,
                managerName: data.managerName,
                email: data.email,
                phone: data.phone,
                street: data.street,
                city: data.city,
                zipCode: data.zipCode,
                contractStatus: data.contractStatus || "PENDING",
                contractStartDate: data.contractStartDate,
                contractEndDate: data.contractEndDate,
                signatureDate: data.signatureDate,
                dipSentDate: data.dipSentDate,
                royaltyRate: data.royaltyRate || 0,
                leadPrice: data.leadPrice || 0,
                notes: data.notes
            }
        });
        revalidatePath('/app/settings/management');
        return { success: true, franchise };
    } catch (error) {
        console.error("Create Franchise Error:", error);
        return { success: false, error: "Failed to create franchise" };
    }
}

export async function updateFranchiseAction(franchiseId: string, data: {
    name?: string;
    siret?: string;
    managerName?: string;
    email?: string;
    phone?: string;
    street?: string;
    city?: string;
    zipCode?: string;
    isActive?: boolean;
    contractStatus?: string;
    contractStartDate?: Date | null;
    contractEndDate?: Date | null;
    signatureDate?: Date | null;
    dipSentDate?: Date | null;
    royaltyRate?: number;
    leadPrice?: number;
    notes?: string;
}) {
    try {
        const franchise = await (prisma as any).franchise.update({
            where: { id: franchiseId },
            data
        });
        revalidatePath('/app/settings/management');
        return { success: true, franchise };
    } catch (error) {
        console.error("Update Franchise Error:", error);
        return { success: false, error: "Failed to update franchise" };
    }
}

export async function deleteFranchiseAction(franchiseId: string) {
    try {
        // First detach all agencies from this franchise
        await (prisma as any).agency.updateMany({
            where: { franchiseId },
            data: { franchiseId: null }
        });

        // Then delete the franchise
        await (prisma as any).franchise.delete({
            where: { id: franchiseId }
        });
        revalidatePath('/app/settings');
        return { success: true };
    } catch (error) {
        console.error("Delete Franchise Error:", error);
        return { success: false, error: "Failed to delete franchise" };
    }
}

// --- AGENCY-FRANCHISE ASSIGNMENT ---

export async function assignAgencyToFranchiseAction(agencyId: string, franchiseId: string | null) {
    try {
        await (prisma as any).agency.update({
            where: { id: agencyId },
            data: { franchiseId: franchiseId }
        });
        revalidatePath('/app/settings');
        return { success: true };
    } catch (error) {
        console.error("Assign Agency Error:", error);
        return { success: false, error: "Failed to assign agency to franchise" };
    }
}

// --- USER-FRANCHISE ASSIGNMENT ---

export async function getUserFranchisesAction(userId: string) {
    try {
        const userFranchises = await (prisma as any).userFranchise.findMany({
            where: { userId },
            include: { franchise: true }
        });
        return { success: true, franchises: userFranchises.map((uf: any) => uf.franchise) };
    } catch (error) {
        console.error("Get User Franchises Error:", error);
        return { success: false, error: "Failed to fetch user franchises" };
    }
}

export async function assignUserToFranchiseAction(userId: string, franchiseId: string) {
    try {
        await (prisma as any).userFranchise.upsert({
            where: { userId_franchiseId: { userId, franchiseId } },
            create: { userId, franchiseId },
            update: {}
        });
        revalidatePath('/app/settings');
        return { success: true };
    } catch (error) {
        console.error("Assign User to Franchise Error:", error);
        return { success: false, error: "Failed to assign user to franchise" };
    }
}

export async function removeUserFromFranchiseAction(userId: string, franchiseId: string) {
    try {
        await (prisma as any).userFranchise.delete({
            where: { userId_franchiseId: { userId, franchiseId } }
        });
        revalidatePath('/app/settings');
        return { success: true };
    } catch (error) {
        console.error("Remove User from Franchise Error:", error);
        return { success: false, error: "Failed to remove user from franchise" };
    }
}

// --- ACCESS CHECK HELPER ---

/**
 * Get the franchise IDs that the current user has access to.
 * Returns null if user is admin (full access).
 */
export async function getCurrentUserFranchiseIds(organisationId: string): Promise<{ isAdmin: boolean, franchiseIds: string[] }> {
    const userId = await getCurrentUserId();
    if (!userId) return { isAdmin: false, franchiseIds: [] };

    // Check user role in organisation
    const grant = await (prisma as any).userAccessGrant.findFirst({
        where: { userId, organisationId },
        include: { role: true }
    });

    if (!grant) return { isAdmin: false, franchiseIds: [] };

    const roleName = grant.role?.name?.toUpperCase() || '';
    const isAdmin = roleName.includes('ADMIN') || roleName.includes('DIRECTEUR') || roleName.includes('SUPER');

    if (isAdmin) {
        return { isAdmin: true, franchiseIds: [] };
    }

    // Get user's assigned franchises
    const userFranchises = await (prisma as any).userFranchise.findMany({
        where: { userId },
        select: { franchiseId: true }
    });

    const franchiseIds = userFranchises.map((uf: any) => uf.franchiseId);
    return { isAdmin: false, franchiseIds };
}
