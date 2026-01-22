'use server';

import { prisma } from '@/lib/prisma';
import { APP_MODULES, getAllPermissionIds } from '../config/modules.config';

/**
 * Synchronizes the system_permissions table with the definitions in modules.config.ts
 * This should be called during app initialization or via an admin trigger.
 */
export async function syncSystemPermissionsAction() {
    try {
        const configIds = getAllPermissionIds();

        // 1. Get existing permissions
        const existing = await (prisma as any).systemPermission.findMany({
            select: { id: true }
        });
        const existingIds = existing.map((p: any) => p.id);

        // 2. Identify missing permissions
        const toCreate = configIds.filter(id => !existingIds.includes(id));

        if (toCreate.length === 0) {
            return { success: true, message: "Permissions already in sync" };
        }

        // 3. Create missing permissions
        // Note: We'll use the ID as the description for now, or find a better way to map descriptions
        await (prisma as any).systemPermission.createMany({
            data: toCreate.map(id => ({
                id,
                description: `Permission for ${id.replace(/_/g, ' ').toLowerCase()}`
            })),
            skipDuplicates: true
        });

        return {
            success: true,
            message: `Synchronized ${toCreate.length} new permissions`,
            created: toCreate
        };
    } catch (error) {
        console.error('[SyncPermissions] Error:', error);
        return { success: false, error: "Failed to synchronize permissions" };
    }
}
