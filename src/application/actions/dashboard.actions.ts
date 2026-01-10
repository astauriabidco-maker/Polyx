'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface WidgetConfig {
    id: string;
    type: string;
    title: string;
    metric: string;
    icon: string;
    color: string;
    size: string;
}

export async function getDashboardConfigAction(userId: string) {
    try {
        const config = await prisma.dashboardConfig.findFirst({
            where: { userId, isDefault: true }
        });

        if (!config) {
            return { success: true, config: null };
        }

        return {
            success: true,
            config: {
                id: config.id,
                name: config.name,
                widgets: JSON.parse(config.widgets) as WidgetConfig[]
            }
        };
    } catch (error) {
        console.error('[Dashboard] Error loading config:', error);
        return { success: false, error: 'Failed to load dashboard config' };
    }
}

export async function saveDashboardConfigAction(userId: string, widgets: WidgetConfig[], name?: string) {
    try {
        // Find existing default config
        const existing = await prisma.dashboardConfig.findFirst({
            where: { userId, isDefault: true }
        });

        const widgetsJson = JSON.stringify(widgets);

        if (existing) {
            // Update existing config
            await prisma.dashboardConfig.update({
                where: { id: existing.id },
                data: {
                    widgets: widgetsJson,
                    name: name || existing.name
                }
            });
        } else {
            // Create new config
            await prisma.dashboardConfig.create({
                data: {
                    userId,
                    name: name || 'Mon Dashboard',
                    isDefault: true,
                    widgets: widgetsJson
                }
            });
        }

        revalidatePath('/app/dashboard');
        return { success: true };
    } catch (error) {
        console.error('[Dashboard] Error saving config:', error);
        return { success: false, error: 'Failed to save dashboard config' };
    }
}

export async function deleteDashboardConfigAction(configId: string) {
    try {
        await prisma.dashboardConfig.delete({
            where: { id: configId }
        });

        revalidatePath('/app/dashboard');
        return { success: true };
    } catch (error) {
        console.error('[Dashboard] Error deleting config:', error);
        return { success: false, error: 'Failed to delete dashboard config' };
    }
}
