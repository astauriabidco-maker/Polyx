'use server';

import { prisma } from '@/lib/prisma';
import { CefrLevel, SectionType } from '@prisma/client';

export async function getQuestionsByFilterAction(orgId: string, sectionType: SectionType, level: CefrLevel) {
    try {
        const questions = await prisma.question.findMany({
            where: {
                sectionType,
                level,
                isActive: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return { success: true, data: questions };
    } catch (error) {
        console.error('Error fetching questions:', error);
        return { success: false, error: 'Failed to fetch questions' };
    }
}
