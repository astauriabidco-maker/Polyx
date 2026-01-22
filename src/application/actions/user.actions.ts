'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getUsersAction(organisationId: string) {
    try {
        const grants = await (prisma as any).userAccessGrant.findMany({
            where: { organisationId },
            include: {
                user: {
                    include: {
                        agencies: {
                            include: { agency: true }
                        },
                        franchises: {
                            include: { franchise: true }
                        }
                    }
                },
                role: true
            }
        });

        const users = grants.map((grant: any) => ({
            id: grant.user.id,
            email: grant.user.email,
            firstName: grant.user.firstName,
            lastName: grant.user.lastName,
            isActive: grant.user.isActive,
            role: grant.role.name,
            roleId: grant.role.id,
            agencyIds: grant.user.agencies.map((ua: any) => ua.agencyId),
            agencies: grant.user.agencies.map((ua: any) => ua.agency),
            franchiseIds: grant.user.franchises.map((uf: any) => uf.franchiseId),
            franchises: grant.user.franchises.map((uf: any) => uf.franchise),
            // Mock membership structure for compatibility with frontend entities if needed
            memberships: [
                {
                    organizationId: organisationId,
                    role: grant.role.name,
                    agencyIds: grant.user.agencies.map((ua: any) => ua.agencyId),
                    franchiseIds: grant.user.franchises.map((uf: any) => uf.franchiseId),
                    isActive: grant.isActive
                }
            ]
        }));

        return { success: true, users };
    } catch (error) {
        console.error("Get Users Error:", error);
        return { success: false, error: "Failed to fetch users" };
    }
}

export async function inviteUserAction(formData: FormData, organisationId: string) {
    try {
        const email = formData.get('email') as string;
        const firstName = formData.get('firstName') as string;
        const lastName = formData.get('lastName') as string;
        const roleId = formData.get('role') as string;
        const agencyIds = formData.getAll('agencyIds') as string[];
        const franchiseIds = formData.getAll('franchiseIds') as string[];

        // Start a transaction
        await prisma.$transaction(async (tx: any) => {
            // 1. Upsert User
            let user = await tx.user.upsert({
                where: { email },
                update: { firstName, lastName },
                create: { email, firstName, lastName, isActive: true }
            });

            // 2. Create Access Grant
            await tx.userAccessGrant.upsert({
                where: {
                    userId_organisationId: {
                        userId: user.id,
                        organisationId
                    }
                },
                update: { roleId },
                create: { userId: user.id, organisationId, roleId }
            });

            // 3. Update Agency Assignments
            const orgAgencies = await tx.agency.findMany({
                where: { organisationId },
                select: { id: true }
            });
            const orgAgencyIds = orgAgencies.map((a: any) => a.id);

            await tx.userAgency.deleteMany({
                where: {
                    userId: user.id,
                    agencyId: { in: orgAgencyIds }
                }
            });

            if (agencyIds.length > 0) {
                await tx.userAgency.createMany({
                    data: agencyIds.map(aid => ({
                        userId: user.id,
                        agencyId: aid
                    }))
                });
            }

            // 4. Update Franchise Assignments
            const orgFranchises = await tx.franchise.findMany({
                where: { organisationId },
                select: { id: true }
            });
            const orgFranchiseIds = orgFranchises.map((f: any) => f.id);

            await tx.userFranchise.deleteMany({
                where: {
                    userId: user.id,
                    franchiseId: { in: orgFranchiseIds }
                }
            });

            if (franchiseIds.length > 0) {
                await tx.userFranchise.createMany({
                    data: franchiseIds.map(fid => ({
                        userId: user.id,
                        franchiseId: fid
                    }))
                });
            }
        });

        revalidatePath('/app/settings/users');
        return { success: true };
    } catch (error) {
        console.error("Invite User Error:", error);
        return { success: false, error: "Failed to invite user" };
    }
}

export async function updateUserAction(formData: FormData, organisationId: string) {
    return inviteUserAction(formData, organisationId);
}

// ============================================
// SUPER-ADMIN: ALL USERS (User-Centric View)
// ============================================

import { requireGlobalAdmin } from '@/lib/server-guard';

/**
 * Get all users across all organizations (Super-Admin only)
 */
export async function getAllUsersAction() {
    await requireGlobalAdmin();
    try {
        const users = await prisma.user.findMany({
            include: {
                accessGrants: {
                    include: {
                        organisation: { select: { id: true, name: true } },
                        role: { select: { id: true, name: true } }
                    }
                },
                agencies: {
                    include: { agency: { select: { id: true, name: true, organisationId: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return {
            success: true,
            users: users.map(u => ({
                id: u.id,
                email: u.email,
                firstName: u.firstName,
                lastName: u.lastName,
                isActive: u.isActive,
                isGlobalAdmin: u.isGlobalAdmin,
                accessCount: u.accessGrants.length,
                accesses: u.accessGrants.map(g => ({
                    orgId: g.organisation.id,
                    orgName: g.organisation.name,
                    roleId: g.role.id,
                    roleName: g.role.name,
                    isActive: g.isActive
                })),
                agencies: u.agencies.map(ua => ({
                    id: ua.agency.id,
                    name: ua.agency.name,
                    orgId: ua.agency.organisationId
                }))
            }))
        };
    } catch (error) {
        console.error('[UserAction] Get All Users Error:', error);
        return { success: false, error: 'Echec de la récupération des utilisateurs' };
    }
}

/**
 * Create a user with multiple organization accesses (User-Centric approach)
 */
export async function createUserWithAccessesAction(data: {
    email: string;
    firstName: string;
    lastName: string;
    accesses: Array<{
        orgId: string;
        roleId: string;
        agencyIds: string[] | 'ALL';
    }>;
}) {
    await requireGlobalAdmin();
    try {
        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Upsert User
            const user = await tx.user.upsert({
                where: { email: data.email },
                update: { firstName: data.firstName, lastName: data.lastName },
                create: {
                    email: data.email,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    isActive: true
                }
            });

            // 2. Create Access Grants for each org
            for (const access of data.accesses) {
                await tx.userAccessGrant.upsert({
                    where: {
                        userId_organisationId: {
                            userId: user.id,
                            organisationId: access.orgId
                        }
                    },
                    update: { roleId: access.roleId, isActive: true },
                    create: {
                        userId: user.id,
                        organisationId: access.orgId,
                        roleId: access.roleId,
                        isActive: true
                    }
                });

                // 3. Handle agency assignments
                if (access.agencyIds !== 'ALL') {
                    // Clear existing agencies for this org
                    const orgAgencies = await tx.agency.findMany({
                        where: { organisationId: access.orgId },
                        select: { id: true }
                    });
                    const orgAgencyIds = orgAgencies.map((a: any) => a.id);

                    await tx.userAgency.deleteMany({
                        where: {
                            userId: user.id,
                            agencyId: { in: orgAgencyIds }
                        }
                    });

                    // Assign specific agencies
                    if (access.agencyIds.length > 0) {
                        await tx.userAgency.createMany({
                            data: access.agencyIds.map(aid => ({
                                userId: user.id,
                                agencyId: aid
                            })),
                            skipDuplicates: true
                        });
                    }
                }
            }

            return user;
        });

        revalidatePath('/super-admin/users');
        return { success: true, user: result };
    } catch (error) {
        console.error('[UserAction] Create User With Accesses Error:', error);
        return { success: false, error: 'Echec de la création de l\'utilisateur' };
    }
}
