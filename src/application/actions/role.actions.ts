'use server';

import { db } from '@/infrastructure/mock-db';
import { RoleDefinition, Permission } from '@/domain/entities/permission';

export async function getRolesAction(organizationId: string) {
    await new Promise(resolve => setTimeout(resolve, 500));

    const org = db.organizations.find(o => o.id === organizationId);
    if (!org) return { error: 'Organization not found' };

    // Return merged list: System Roles (from MockDB seed) + Custom Roles
    return { success: true, roles: org.roles || [] };
}

export async function createRoleAction(organizationId: string, formData: FormData) {
    await new Promise(resolve => setTimeout(resolve, 500));

    const name = formData.get('name') as string;
    const permissions = formData.getAll('permissions') as Permission[];

    if (!name) return { error: 'Role name is required' };

    const org = db.organizations.find(o => o.id === organizationId);
    if (!org) return { error: 'Organization not found' };

    const newRole: RoleDefinition = {
        id: crypto.randomUUID(),
        name,
        isSystem: false,
        organizationId,
        permissions: permissions.length > 0 ? permissions : ['view:training'], // Default minimal
        description: 'Custom Role'
    };

    if (!org.roles) org.roles = [];
    org.roles.push(newRole);

    return { success: true, role: newRole };
}

export async function deleteRoleAction(organizationId: string, roleId: string) {
    await new Promise(resolve => setTimeout(resolve, 500));

    const org = db.organizations.find(o => o.id === organizationId);
    if (!org || !org.roles) return { error: 'Organization or Roles not found' };

    const roleIndex = org.roles.findIndex(r => r.id === roleId);
    if (roleIndex === -1) return { error: 'Role not found' };

    const role = org.roles[roleIndex];
    if (role.isSystem) return { error: 'Cannot delete system roles' };

    // Check usage
    const isUsed = db.users.some(u =>
        u.memberships.some(m => m.organizationId === organizationId && m.role === roleId)
    );
    if (isUsed) return { error: 'Role is assigned to users. Reassign them first.' };

    org.roles.splice(roleIndex, 1);

    return { success: true };
}

export async function updateRoleAction(organizationId: string, roleId: string, formData: FormData) {
    await new Promise(resolve => setTimeout(resolve, 500));

    const name = formData.get('name') as string;
    const permissions = formData.getAll('permissions') as Permission[];

    if (!name) return { error: 'Role name is required' };

    const org = db.organizations.find(o => o.id === organizationId);
    if (!org || !org.roles) return { error: 'Organization or Roles not found' };

    const role = org.roles.find(r => r.id === roleId);
    if (!role) return { error: 'Role not found' };
    if (role.isSystem) return { error: 'Cannot update system roles' };

    role.name = name;
    role.permissions = permissions;
    role.description = formData.get('description') as string || role.description;

    return { success: true, role };
}
