import { prisma } from './prisma';
import { z } from 'zod';

// Define the permissions schema
export const ComputedPermissionsSchema = z.object({
    canViewFinance: z.boolean(),
    canEditUsers: z.boolean(),
    canManageCourses: z.boolean(),
    canManageLeads: z.boolean(),
    // Map of all specific permission slugs (e.g. { 'DASHBOARD_VIEW': true, 'LEADS_ORCHESTRATION': true })
    permissions: z.record(z.string(), z.boolean()).default({}),
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
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isGlobalAdmin: true }
    });

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

    let results = accessGrants.map((grant) => {
        // 1. Get all permission slugs linked to this role
        const permissionIds = grant.role.permissions.map(p => p.id);

        // 2. Build the dynamic permissions map
        const permissionsMap: Record<string, boolean> = {};
        permissionIds.forEach(id => {
            permissionsMap[id] = true;
        });

        // 3. AUTO-MAP NEW PERMISSIONS FROM OLD ONES (Transition Period)
        const roleName = grant.role.name.toUpperCase();
        const isAdminRole = roleName.includes('ADMIN') || roleName.includes('DIRECTEUR') || roleName.includes('OWNER') || user?.isGlobalAdmin;

        if (isAdminRole) {
            ['DASHBOARD_VIEW', 'AGENDA_VIEW', 'LEADS_VIEW', 'CRM_VIEW', 'LEARNERS_VIEW', 'ATTENDANCE_VIEW', 'EXAMS_VIEW', 'TRAINERS_VIEW', 'ACADEMY_VIEW', 'QUALITY_VIEW', 'WATCH_VIEW', 'NETWORK_VIEW', 'ADMIN_VIEW', 'INTEGRATIONS_VIEW', 'BILLING_VIEW', 'AUDIT_VIEW', 'BPF_VIEW', 'STRATEGIC_VIEW', 'USERS_MANAGE', 'ROLES_MANAGE', 'STRUCTURE_MANAGE'].forEach(id => {
                permissionsMap[id] = true;
            });
        }

        if (permissionIds.includes('FINANCE_VIEW') || permissionsMap['DASHBOARD_VIEW']) {
            permissionsMap['DASHBOARD_VIEW'] = true;
            permissionsMap['BILLING_VIEW'] = true;
        }
        if (permissionIds.includes('LEAD_MANAGE') || permissionIds.includes('LEADS_VIEW')) {
            permissionsMap['LEADS_VIEW'] = true;
        }
        if (permissionIds.includes('COURSE_MANAGE') || permissionIds.includes('ACADEMY_VIEW')) {
            permissionsMap['ACADEMY_VIEW'] = true;
        }
        if (permissionIds.includes('NETWORK_VIEW') || isAdminRole) {
            permissionsMap['NETWORK_VIEW'] = true;
        }
        if (permissionIds.includes('ADMIN_VIEW') || isAdminRole) {
            permissionsMap['ADMIN_VIEW'] = true;
        }

        let canViewFinance = permissionIds.includes('FINANCE_VIEW') || !!permissionsMap['DASHBOARD_VIEW'];
        let canEditUsers = permissionIds.includes('USER_EDIT') || !!permissionsMap['ADMIN_VIEW'] || !!permissionsMap['NETWORK_VIEW'];
        let canManageCourses = permissionIds.includes('COURSE_MANAGE') || !!permissionsMap['ACADEMY_VIEW'];
        let canManageLeads = permissionIds.includes('LEAD_MANAGE') || !!permissionsMap['LEADS_VIEW'];

        let badgeColor: 'red' | 'blue' | 'green' | 'orange' | 'slate' = 'slate';
        if (roleName.includes('ADMIN') || roleName.includes('DIRECTEUR')) {
            badgeColor = 'red';
        } else if (roleName.includes('COMMERCIAL') || roleName.includes('SALES')) {
            badgeColor = 'green';
        } else if (roleName.includes('FORMATEUR')) {
            badgeColor = 'blue';
        } else if (roleName.includes('MANAGER')) {
            badgeColor = 'orange';
        }

        if (grant.permissionsOverride) {
            try {
                const overrides = typeof grant.permissionsOverride === 'string' ? JSON.parse(grant.permissionsOverride) : grant.permissionsOverride;
                if (overrides.canViewFinance !== undefined) canViewFinance = overrides.canViewFinance;
                if (overrides.canEditUsers !== undefined) canEditUsers = overrides.canEditUsers;
                if (overrides.canManageCourses !== undefined) canManageCourses = overrides.canManageCourses;
                if (overrides.canManageLeads !== undefined) canManageLeads = overrides.canManageLeads;
                if (overrides.permissions) Object.assign(permissionsMap, overrides.permissions);
            } catch (e) { }
        }

        return {
            organisationId: grant.organisationId,
            organisationName: grant.organisation.name,
            role: grant.role.name,
            computedPermissions: {
                canViewFinance,
                canEditUsers,
                canManageCourses,
                canManageLeads,
                permissions: permissionsMap,
                badgeColor,
            },
            turnover: canViewFinance ? grant.organisation.turnover || null : null,
        };
    });

    // 7. For Global Admins, inject all other organisations they don't have explicit access to
    if (user?.isGlobalAdmin) {
        const allOrgs = await prisma.organisation.findMany({
            where: { isActive: true }
        });

        for (const org of allOrgs) {
            if (!results.some(r => r.organisationId === org.id)) {
                results.push({
                    organisationId: org.id,
                    organisationName: org.name,
                    role: 'Global Admin',
                    computedPermissions: {
                        canViewFinance: true,
                        canEditUsers: true,
                        canManageCourses: true,
                        canManageLeads: true,
                        badgeColor: 'red',
                        permissions: {
                            'DASHBOARD_VIEW': true, 'AGENDA_VIEW': true, 'LEADS_VIEW': true, 'CRM_VIEW': true, 'LEARNERS_VIEW': true, 'ATTENDANCE_VIEW': true, 'EXAMS_VIEW': true, 'TRAINERS_VIEW': true, 'ACADEMY_VIEW': true, 'QUALITY_VIEW': true, 'WATCH_VIEW': true, 'NETWORK_VIEW': true, 'ADMIN_VIEW': true, 'INTEGRATIONS_VIEW': true, 'BILLING_VIEW': true, 'AUDIT_VIEW': true, 'BPF_VIEW': true, 'STRATEGIC_VIEW': true, 'USERS_MANAGE': true, 'ROLES_MANAGE': true, 'STRUCTURE_MANAGE': true
                        }
                    },
                    turnover: org.turnover || null
                });
            }
        }
    }

    return results;
}
