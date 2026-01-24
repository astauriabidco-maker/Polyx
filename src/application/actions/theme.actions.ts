'use server';

import { prisma } from '@/lib/prisma';

export async function createThemeAction(orgId: string, name: string, description: string, trainingIds: string[] = []) {
    try {
        const theme = await prisma.assessmentTheme.create({
            data: {
                organisationId: orgId,
                name,
                description,
                trainings: trainingIds.length > 0 ? {
                    connect: trainingIds.map(id => ({ id }))
                } : undefined
            }
        });
        return { success: true, data: theme };
    } catch (error) {
        console.error('Error creating theme:', error);
        return { success: false, error: 'Failed to create theme' };
    }
}

export async function getThemesAction(orgId: string) {
    try {
        const themes = await prisma.assessmentTheme.findMany({
            where: {
                organisationId: orgId
            },
            include: {
                trainings: {
                    select: { id: true, title: true }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });
        return { success: true, data: themes };
    } catch (error) {
        console.error('Error fetching themes:', error);
        return { success: false, error: 'Failed to fetch themes' };
    }
}

export async function deleteThemeAction(id: string, orgId: string) {
    try {
        // Verify ownership
        const theme = await prisma.assessmentTheme.findFirst({
            where: { id, organisationId: orgId }
        });

        if (!theme) return { success: false, error: 'Theme not found' };

        await prisma.assessmentTheme.delete({
            where: { id }
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting theme:', error);
        return { success: false, error: 'Failed to delete theme' };
    }
}
