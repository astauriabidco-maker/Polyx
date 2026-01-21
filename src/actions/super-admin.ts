'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/security';

/**
 * Security: Verifies if the current user is a Global Admin.
 */
async function checkGlobalAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
        throw new Error('Non authentifié');
    }

    const payload = await verifyToken(token);
    if (!payload) {
        throw new Error('Token invalide');
    }

    if (!payload.isGlobalAdmin) {
        throw new Error('Accès réservé aux administrateurs plateforme');
    }

    return payload.userId;
}

/**
 * Fetches all organizations with member counts and basic stats.
 */
/**
 * Fetches all organizations with member counts, basic stats, and validation info.
 */
export async function getAllOrganisations(statusFilter?: string) {
    await checkGlobalAdmin();

    try {
        const where = statusFilter && statusFilter !== 'ALL'
            ? { status: statusFilter }
            : {};

        const orgs = await prisma.organisation.findMany({
            where,
            include: {
                _count: {
                    select: {
                        accessGrants: true,
                        agencies: true,
                        roles: true,
                        invitations: true,
                        leads: true,
                        learners: true
                    }
                }
            },
            orderBy: [
                { status: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        // Enrich with activator name
        const activatorIds = orgs
            .map(o => o.activatedById)
            .filter((id): id is string => !!id);

        const activators = await prisma.user.findMany({
            where: { id: { in: activatorIds } },
            select: { id: true, firstName: true, lastName: true, email: true }
        });

        const enrichedOrgs = orgs.map(org => {
            const activator = activators.find(u => u.id === org.activatedById);
            return {
                ...org,
                activatedByName: activator
                    ? `${activator.firstName} ${activator.lastName}`.trim() || activator.email
                    : null
            };
        });

        return { success: true, organisations: enrichedOrgs };
    } catch (error) {
        console.error('Error in getAllOrganisations:', error);
        return { success: false, error: 'Échec de la récupération des organisations' };
    }
}

/**
 * Toggles organisation status (Active/Inactive) - Legacy
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
 * Activate an organization (sets status to ACTIVE, creates admin role, sends invitation)
 * @param orgId - Organization ID to activate
 * @param adminEmail - Optional email to send invitation (overrides primaryContactEmail)
 * @param adminName - Optional name for the admin
 */
export async function activateOrganisation(orgId: string, adminEmail?: string, adminName?: string) {
    const superAdminId = await checkGlobalAdmin();

    try {
        const org = await prisma.organisation.findUnique({
            where: { id: orgId }
        });

        if (!org) return { success: false, error: 'Organisation introuvable' };
        if (org.status === 'ACTIVE') return { success: false, error: 'Déjà active' };

        // Use provided email or fall back to org's primaryContactEmail
        const targetEmail = adminEmail || org.primaryContactEmail;
        const targetName = adminName || org.primaryContactName;

        // Transaction: Update status + Create role + Send invitation
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update org status + optionally update contact info
            const updateData: any = {
                status: 'ACTIVE',
                activatedAt: new Date(),
                activatedById: superAdminId,
                isActive: true
            };

            // If adminEmail was explicitly provided, update the org's primary contact
            if (adminEmail) {
                updateData.primaryContactEmail = adminEmail;
            }
            if (adminName) {
                updateData.primaryContactName = adminName;
            }

            const updatedOrg = await tx.organisation.update({
                where: { id: orgId },
                data: updateData
            });

            // 2. Create Admin role if not exists
            let adminRole = await tx.role.findFirst({
                where: { organisationId: orgId, isSystemDefault: true }
            });

            if (!adminRole) {
                adminRole = await tx.role.create({
                    data: {
                        name: 'Administrateur',
                        organisationId: orgId,
                        isSystemDefault: true
                    }
                });

                // Connect system permissions to admin role (all permissions)
                const allPermissions = await tx.systemPermission.findMany();
                if (allPermissions.length > 0) {
                    await tx.role.update({
                        where: { id: adminRole.id },
                        data: {
                            permissions: {
                                connect: allPermissions.map((p: any) => ({ id: p.id }))
                            }
                        }
                    });
                }
            }

            // 3. Create invitation for admin
            let invitation = null;
            if (targetEmail) {
                // Invalidate any existing pending invitations for this email in this org
                await tx.invitation.updateMany({
                    where: {
                        organisationId: orgId,
                        email: targetEmail,
                        status: 'PENDING'
                    },
                    data: { status: 'EXPIRED' }
                });

                const token = crypto.randomUUID();
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7); // 7 days validity

                invitation = await tx.invitation.create({
                    data: {
                        email: targetEmail,
                        token,
                        expiresAt,
                        status: 'PENDING',
                        organisationId: orgId,
                        roleId: adminRole.id
                    }
                });

                // Log: In production, send email here
                console.log(`[Onboarding] 📧 Invitation created for ${targetEmail}`);
                console.log(`[Onboarding] 🔗 Token: ${token}`);
                console.log(`[Onboarding] 🔗 Link: /auth/accept-invitation?token=${token}`);
            }

            return { org: updatedOrg, adminRole, invitation, targetEmail };
        });

        revalidatePath('/super-admin');
        return {
            success: true,
            message: result.invitation
                ? `Organisation activée ! Invitation envoyée à ${result.targetEmail}`
                : 'Organisation activée (aucun email fourni pour l\'invitation)',
            organisation: result.org,
            invitation: result.invitation,
            invitationLink: result.invitation
                ? `/auth/accept-invitation?token=${result.invitation.token}`
                : null
        };
    } catch (error) {
        console.error('Activate org error:', error);
        return { success: false, error: 'Échec de l\'activation' };
    }
}


/**
 * Reject an organization
 */
export async function rejectOrganisation(orgId: string, reason: string) {
    const adminId = await checkGlobalAdmin();

    try {
        const org = await prisma.organisation.update({
            where: { id: orgId },
            data: {
                status: 'REJECTED',
                rejectionNote: reason,
                activatedById: adminId,
                isActive: false
            }
        });

        revalidatePath('/super-admin');
        return { success: true, organisation: org };
    } catch (error) {
        return { success: false, error: 'Échec du rejet' };
    }
}

/**
 * Suspend an active organization
 */
export async function suspendOrganisation(orgId: string, reason: string) {
    await checkGlobalAdmin();

    try {
        const org = await prisma.organisation.update({
            where: { id: orgId },
            data: {
                status: 'SUSPENDED',
                rejectionNote: reason,
                isActive: false
            }
        });

        revalidatePath('/super-admin');
        return { success: true, organisation: org };
    } catch (error) {
        return { success: false, error: 'Échec de la suspension' };
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
            prisma.organisation.count({ where: { status: 'PENDING' } }),
            prisma.organisation.count({ where: { status: 'ACTIVE' } }),
            prisma.user.count(),
            prisma.userAccessGrant.count(),
            prisma.invitation.count({ where: { status: 'PENDING' } })
        ]);

        return {
            success: true,
            stats: {
                totalOrgs: stats[0],
                pendingOrgs: stats[1],
                activeOrgs: stats[2],
                totalUsers: stats[3],
                totalAccessGrants: stats[4],
                pendingInvitations: stats[5],
            }
        };
    } catch (error) {
        return { success: false, error: 'Échec de la récupération des stats' };
    }
}
