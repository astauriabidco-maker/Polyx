'use server';

import { prisma } from '@/lib/prisma';
import { ReviewStatus, CefrLevel, SectionType } from '@prisma/client';

export async function getReviewQueueAction(orgId: string) {
    try {
        const drafts = await prisma.question.findMany({
            where: {
                status: 'DRAFT',
                isActive: false // double safety
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, count: drafts.length, data: drafts };
    } catch (error) {
        return { success: false, error: 'Failed to fetch review queue' };
    }
}

export async function approveQuestionAction(id: string, orgId: string) {
    try {
        await prisma.question.update({
            where: { id },
            data: { status: 'APPROVED', isActive: true }
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to approve' };
    }
}

export async function rejectQuestionAction(id: string, orgId: string) {
    try {
        await prisma.question.update({
            where: { id },
            data: { status: 'REJECTED', isActive: false }
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to reject' };
    }
}
