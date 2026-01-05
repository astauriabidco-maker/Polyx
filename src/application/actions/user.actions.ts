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
