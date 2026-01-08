'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ============================================
// ROLES CRUD (Prisma-backed)
// ============================================

export async function getRolesAction(organisationId: string) {
    try {
        const roles = await (prisma as any).role.findMany({
            where: { organisationId },
            include: {
                permissions: true,
                _count: { select: { accessGrants: true } }
            },
            orderBy: [
                { isSystemDefault: 'desc' },
                { name: 'asc' }
            ]
        });

        // Transform for frontend compatibility
        const formattedRoles = roles.map((role: any) => ({
            id: role.id,
            name: role.name,
            isSystem: role.isSystemDefault,
            organizationId: role.organisationId,
            permissions: role.permissions.map((p: any) => p.id),
            description: `${role._count.accessGrants} utilisateur(s)`,
            userCount: role._count.accessGrants
        }));

        return { success: true, roles: formattedRoles };
    } catch (error) {
        console.error('[RoleAction] Get Roles Error:', error);
        return { success: false, error: 'Failed to fetch roles' };
    }
}

export async function createRoleAction(organisationId: string, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const permissionIds = formData.getAll('permissions') as string[];
        const description = formData.get('description') as string;

        if (!name) return { success: false, error: 'Le nom du rôle est requis' };

        // Check for duplicate name
        const existing = await (prisma as any).role.findFirst({
            where: { organisationId, name }
        });
        if (existing) return { success: false, error: 'Un rôle avec ce nom existe déjà' };

        const role = await (prisma as any).role.create({
            data: {
                name,
                organisationId,
                isSystemDefault: false,
                permissions: {
                    connect: permissionIds.map(id => ({ id }))
                }
            },
            include: { permissions: true }
        });

        revalidatePath('/app/settings/roles');
        return {
            success: true,
            role: {
                id: role.id,
                name: role.name,
                isSystem: false,
                organizationId: role.organisationId,
                permissions: role.permissions.map((p: any) => p.id),
                description: description || 'Rôle personnalisé'
            }
        };
    } catch (error) {
        console.error('[RoleAction] Create Role Error:', error);
        return { success: false, error: 'Failed to create role' };
    }
}

export async function updateRoleAction(organisationId: string, roleId: string, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const permissionIds = formData.getAll('permissions') as string[];

        if (!name) return { success: false, error: 'Le nom du rôle est requis' };

        // Check if role exists and is not system default
        const existing = await (prisma as any).role.findUnique({
            where: { id: roleId }
        });
        if (!existing) return { success: false, error: 'Rôle introuvable' };
        if (existing.isSystemDefault) return { success: false, error: 'Impossible de modifier un rôle système' };

        // Update role
        const role = await (prisma as any).role.update({
            where: { id: roleId },
            data: {
                name,
                permissions: {
                    set: permissionIds.map(id => ({ id }))
                }
            },
            include: { permissions: true }
        });

        revalidatePath('/app/settings/roles');
        return {
            success: true,
            role: {
                id: role.id,
                name: role.name,
                isSystem: role.isSystemDefault,
                organizationId: role.organisationId,
                permissions: role.permissions.map((p: any) => p.id)
            }
        };
    } catch (error) {
        console.error('[RoleAction] Update Role Error:', error);
        return { success: false, error: 'Failed to update role' };
    }
}

export async function deleteRoleAction(organisationId: string, roleId: string) {
    try {
        // Check if role exists and is not system default
        const existing = await (prisma as any).role.findUnique({
            where: { id: roleId },
            include: { _count: { select: { accessGrants: true } } }
        });

        if (!existing) return { success: false, error: 'Rôle introuvable' };
        if (existing.isSystemDefault) return { success: false, error: 'Impossible de supprimer un rôle système' };
        if (existing._count.accessGrants > 0) {
            return { success: false, error: `Ce rôle est assigné à ${existing._count.accessGrants} utilisateur(s). Réassignez-les d'abord.` };
        }

        await (prisma as any).role.delete({
            where: { id: roleId }
        });

        revalidatePath('/app/settings/roles');
        return { success: true };
    } catch (error) {
        console.error('[RoleAction] Delete Role Error:', error);
        return { success: false, error: 'Failed to delete role' };
    }
}

// ============================================
// SYSTEM PERMISSIONS
// ============================================

export async function getSystemPermissionsAction() {
    try {
        const permissions = await (prisma as any).systemPermission.findMany({
            orderBy: { id: 'asc' }
        });

        return { success: true, permissions };
    } catch (error) {
        console.error('[RoleAction] Get Permissions Error:', error);
        return { success: false, error: 'Failed to fetch permissions' };
    }
}
