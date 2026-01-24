'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// --- QUERIES ---

export async function getTrainingsCompactAction(orgId: string) {
    try {
        const trainings = await prisma.training.findMany({
            where: { organisationId: orgId, isActive: true },
            select: { id: true, title: true, category: true },
            orderBy: { title: 'asc' }
        });
        return { success: true, data: trainings };
    } catch (error) {
        return { success: false, error: 'Failed' };
    }
}

export async function getTrainingsAction(orgId: string) {
    return getTrainingsCompactAction(orgId);
}

// --- MUTATIONS ---

export async function createTrainingAction(orgId: string, data: any) {
    try {
        const training = await prisma.training.create({
            data: {
                organisationId: orgId,
                title: data.title,
                category: data.category,
                level: data.level || 'BEGINNER',
                durationHours: parseInt(data.durationHours) || 0,
                priceHt: parseFloat(data.priceHt) || 0,
                description: data.description,
            }
        });
        revalidatePath('/app/academy/catalog');
        return { success: true, data: training };
    } catch (error) {
        console.error('Create Training Error:', error);
        return { success: false, error: 'Failed to create training' };
    }
}

export async function updateTrainingAction(id: string, orgId: string, data: any) {
    try {
        // Verify ownership
        const existing = await prisma.training.findUnique({
            where: { id }
        });

        if (!existing || existing.organisationId !== orgId) {
            return { success: false, error: 'Unauthorized or not found' };
        }

        const training = await prisma.training.update({
            where: { id },
            data: {
                title: data.title,
                category: data.category,
                level: data.level,
                durationHours: parseInt(data.durationHours) || 0,
                priceHt: parseFloat(data.priceHt) || 0,
                description: data.description,
                isActive: data.isActive,
            }
        });
        revalidatePath('/app/academy/catalog');
        return { success: true, data: training };
    } catch (error) {
        console.error('Update Training Error:', error);
        return { success: false, error: 'Failed to update training' };
    }
}

export async function deleteTrainingAction(id: string, orgId: string) {
    try {
        const existing = await prisma.training.findUnique({
            where: { id }
        });

        if (!existing || existing.organisationId !== orgId) {
            return { success: false, error: 'Unauthorized or not found' };
        }

        await prisma.training.delete({
            where: { id }
        });
        revalidatePath('/app/academy/catalog');
        return { success: true };
    } catch (error) {
        console.error('Delete Training Error:', error);
        return { success: false, error: 'Failed to delete training' };
    }
}
