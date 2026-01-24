'use server';

import { prisma } from '@/lib/prisma';

export async function updateQuestionStatsAction(questionId: string, isCorrect: boolean) {
    try {
        const question = await prisma.question.findUnique({
            where: { id: questionId }
        });

        if (!question) return { success: false, error: 'Question not found' };

        const newAttempts = question.attempts + 1;
        const newSuccessCount = isCorrect ? question.successCount + 1 : question.successCount;
        const successRate = (newSuccessCount / newAttempts) * 100;

        let reliability = 100.0;
        let flagged = false;

        // Simple Psychometric Rules
        // 1. Too Easy (>95% success after 10 attempts)
        if (newAttempts > 10 && successRate > 95) {
            reliability = 50;
            flagged = true; // Needs check (A1 level disguised as B2?)
        }

        // 2. Too Hard (<20% success after 10 attempts)
        if (newAttempts > 10 && successRate < 20) {
            reliability = 40;
            flagged = true; // Needs check (Ambiguous question?)
        }

        await prisma.question.update({
            where: { id: questionId },
            data: {
                attempts: newAttempts,
                successCount: newSuccessCount,
                reliabilityScore: reliability,
                flaggedForReview: flagged
            }
        });

        return { success: true, flagged };
    } catch (error) {
        console.error('Stats Update Error:', error);
        return { success: false, error: 'Failed to update stats' };
    }
}
