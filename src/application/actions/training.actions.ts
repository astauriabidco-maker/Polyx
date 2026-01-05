'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { checkPermissions } from '@/lib/server-utils';

export interface TrainingState {
    success?: boolean;
    error?: string;
    training?: any;
    trainings?: any[];
}

export async function createTrainingAction(data: any, orgId: string): Promise<TrainingState> {
    try {
        await checkPermissions('canManageCourses', orgId);

        const training = await prisma.training.create({
            data: {
                organisationId: orgId,
                title: data.title,
                code: data.code,
                description: data.description,
                durationHours: parseInt(data.durationHours) || 0,
                priceHt: parseFloat(data.priceHt) || 0,
                level: data.level,
                category: data.category,
                examId: data.examId
            }
        });

        revalidatePath('/app/academy/catalog');
        return { success: true, training };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateTrainingAction(id: string, data: any, orgId: string): Promise<TrainingState> {
    try {
        await checkPermissions('canManageCourses', orgId);

        const training = await prisma.training.update({
            where: { id },
            data: {
                title: data.title,
                code: data.code,
                description: data.description,
                durationHours: parseInt(data.durationHours) || 0,
                priceHt: parseFloat(data.priceHt) || 0,
                level: data.level,
                category: data.category,
                isActive: data.isActive,
                examId: data.examId
            }
        });

        revalidatePath('/app/academy/catalog');
        return { success: true, training };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getTrainingsAction(orgId: string): Promise<TrainingState> {
    try {
        // Simple read can contain broader permissions if needed, but keeping it secure
        const trainings = await prisma.training.findMany({
            where: { organisationId: orgId },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, trainings };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteTrainingAction(id: string, orgId: string): Promise<TrainingState> {
    try {
        await checkPermissions('canManageCourses', orgId);

        await prisma.training.delete({
            where: { id }
        });

        revalidatePath('/app/academy/catalog');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
