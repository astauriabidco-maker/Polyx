import { prisma } from './prisma';
import { z } from 'zod';

// Define the permissions schema
export const ComputedPermissionsSchema = z.object({
    canViewFinance: z.boolean(),
    canEditUsers: z.boolean(),
    canManageCourses: z.boolean(),
    canManageLeads: z.boolean(),
    badgeColor: z.enum(['red', 'blue', 'green', 'orange', 'slate']),
});

export type ComputedPermissions = z.infer<typeof ComputedPermissionsSchema>;

// Define the DO (Data Transfer Object) for Organization Access
export const OrgAccessDTOSchema = z.object({
    organisationId: z.string(),
    organisationName: z.string(),
    role: z.string(), // Role name
    computedPermissions: ComputedPermissionsSchema,
    turnover: z.number().nullable(),
});

export type OrgAccessDTO = z.infer<typeof OrgAccessDTOSchema>;

/**
 * Fetches all organization access grants for a user and computes their permissions
 * based on the dynamic Role and SystemPermissions models.
 */
export async function getUserOrgAccess(userId: string): Promise<OrgAccessDTO[]> {
    const accessGrants = await prisma.userAccessGrant.findMany({
        where: { userId, isActive: true },
        include: {
            organisation: true,
            role: {
                include: {
                    permissions: true,
                }
            }
        },
    });

    return accessGrants.map((grant) => {
        // 1. Get slugs of all permissions linked to this role
        const permissionIds = grant.role.permissions.map(p => p.id);

        // 2. Initial permissions based on Role's permissions
        let canViewFinance = permissionIds.includes('FINANCE_VIEW');
        let canEditUsers = permissionIds.includes('USER_EDIT');
        let canManageCourses = permissionIds.includes('COURSE_MANAGE');
        let canManageLeads = permissionIds.includes('LEAD_MANAGE');

        // 3. Determine Badge Color based on role patterns or defaults
        let badgeColor: 'red' | 'blue' | 'green' | 'orange' | 'slate' = 'slate';
        const roleName = grant.role.name.toUpperCase();

        if (roleName.includes('ADMIN') || roleName.includes('DIRECTEUR')) {
            badgeColor = 'red';
        } else if (roleName.includes('COMMERCIAL') || roleName.includes('SALES')) {
            badgeColor = 'green';
        } else if (roleName.includes('FORMATEUR')) {
            badgeColor = 'blue';
        } else if (roleName.includes('MANAGER')) {
            badgeColor = 'orange';
        }

        // 4. Apply Overrides (Backward compatibility)
        if (grant.permissionsOverride) {
            try {
                const overrides = typeof grant.permissionsOverride === 'string'
                    ? JSON.parse(grant.permissionsOverride)
                    : grant.permissionsOverride;

                if (overrides.canViewFinance !== undefined) canViewFinance = overrides.canViewFinance;
                if (overrides.canEditUsers !== undefined) canEditUsers = overrides.canEditUsers;
                if (overrides.canManageCourses !== undefined) canManageCourses = overrides.canManageCourses;
                if (overrides.canManageLeads !== undefined) canManageLeads = overrides.canManageLeads;
            } catch (e) {
                // Silently fail if JSON is malformed
            }
        }

        // 5. Logic for Turnover (visible only if FINANCE_VIEW is granted)
        const turnover = canViewFinance
            ? grant.organisation.turnover || null
            : null;

        return {
            organisationId: grant.organisationId,
            organisationName: grant.organisation.name,
            role: grant.role.name,
            computedPermissions: {
                canViewFinance,
                canEditUsers,
                canManageCourses,
                canManageLeads,
                badgeColor,
            },
            turnover,
        };
    });
}
