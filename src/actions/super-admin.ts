'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * Security: Verifies if the current user is a Global Admin.
 */
async function checkGlobalAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token || !token.startsWith('mock_token_')) {
        throw new Error('Non authentifié');
    }

    const userId = token.replace('mock_token_', '');
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isGlobalAdmin: true }
    });

    if (!user?.isGlobalAdmin) {
        throw new Error('Accès réservé aux administrateurs plateforme');
    }

    return userId;
}

/**
 * Fetches all organizations with member counts and basic stats.
 */
export async function getAllOrganisations() {
    await checkGlobalAdmin();

    try {
        const orgs = await prisma.organisation.findMany({
            include: {
                _count: {
                    select: {
                        accessGrants: true,
                        agencies: true,
                        roles: true,
                        invitations: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, organisations: orgs };
    } catch (error) {
        console.error('Error in getAllOrganisations:', error);
        return { success: false, error: 'Échec de la récupération des organisations' };
    }
}

/**
 * Toggles organisation status (Active/Inactive)
 */
export async function toggleOrganisationStatus(orgId: string, isActive: boolean) {
    await checkGlobalAdmin();

    try {
        await prisma.organisation.update({
            where: { id: orgId },
            data: { isActive }
        });

        revalidatePath('/super-admin');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Échec de la mise à jour' };
    }
}

/**
 * Get global statistics for the platform.
 */
export async function getPlatformStats() {
    await checkGlobalAdmin();

    try {
        const stats = await prisma.$transaction([
            prisma.organisation.count(),
            prisma.user.count(),
            prisma.userAccessGrant.count(),
            prisma.invitation.count({ where: { status: 'PENDING' } })
        ]);

        return {
            success: true,
            stats: {
                totalOrgs: stats[0],
                totalUsers: stats[1],
                totalAccessGrants: stats[2],
                pendingInvitations: stats[3],
            }
        };
    } catch (error) {
        return { success: false, error: 'Échec de la récupération des stats' };
    }
}
