'use server';

import { prisma } from '@/lib/prisma';
import { AssessmentEngine } from '@/application/services/assessment.service';
import { CefrLevel } from '@prisma/client';

export async function createAssessmentSessionAction(leadId: string, targetLevel: CefrLevel) {
    try {
        const token = crypto.randomUUID();

        const session = await prisma.assessmentSession.create({
            data: {
                leadId,
                targetLevel,
                token,
                status: 'PENDING',
                answers: []
            }
        });

        return { success: true, data: session };
    } catch (error) {
        console.error('Failed to create assessment session:', error);
        return { success: false, error: 'Failed to create session' };
    }
}

export async function submitAssessmentAction(token: string, rawAnswers: Record<string, number>) {
    try {
        const session = await prisma.assessmentSession.findUnique({
            where: { token },
            select: { id: true, status: true }
        });

        if (!session || session.status === 'COMPLETED') {
            return { success: false, error: 'Invalid or completed session' };
        }

        // Call the Engine
        const updatedSession = await AssessmentEngine.calculateGapAndPrescribe(session.id, rawAnswers);

        return { success: true, data: updatedSession };

    } catch (error) {
        console.error('Failed to submit assessment:', error);
        return { success: false, error: 'Submission failed' };
    }
}

export async function getAssessmentSessionAction(token: string) {
    try {
        const session = await prisma.assessmentSession.findUnique({
            where: { token },
            include: { lead: true }
        });

        if (!session) return { success: false, error: 'Session introuvable.' };
        if (session.status === 'COMPLETED') return { success: false, error: 'Ce test a déjà été réalisé.' };

        // Debug Log
        console.log('Available Config Key:', Object.keys(prisma).filter(k => k.startsWith('assessment')));

        // Fetch Questions (random 20)
        // In a real app, we might store the Question IDs in the session to ensure consistency on refresh
        // For now, we fetch generic active questions.
        // Optimization: If questions were already assigned, use them. If not, maybe assign them?
        // Simpler approach per request: Return list.
        const questions = await prisma.question.findMany({
            where: { isActive: true },
            take: 50 // Pool size
        });

        // Randomize 20
        const shuffled = questions.sort(() => 0.5 - Math.random()).slice(0, 20);

        // Sanitize (No correctIndex)
        const safeQuestions = shuffled.map(q => ({
            id: q.id,
            content: q.content,
            choices: q.choices,
            level: q.level
            // NO correctIndex
        }));

        return {
            success: true,
            data: {
                session: {
                    leadName: session.lead.firstName,
                    targetLevel: session.targetLevel,
                    token: session.token,
                    status: session.status,
                    score: session.score,
                    calculatedLevel: session.resultLevel,
                    recommendation: session.recommendation,
                    completedAt: session.completedAt
                },
                questions: safeQuestions
            }
        };
    } catch (error) {
        return { success: false, error: 'Erreur technique lors du chargement du test.' };
    }
}

export async function getAssessmentQuestionsAction() {
    try {
        // Return 20 random questions
        const questions = await prisma.question.findMany({
            where: { isActive: true },
            take: 50
        });

        const shuffled = questions.sort(() => 0.5 - Math.random()).slice(0, 20);

        const safeQuestions = shuffled.map(q => ({
            id: q.id,
            content: q.content,
            choices: q.choices,
            level: q.level
        }));

        return { success: true, data: safeQuestions };
    } catch (error) {
        return { success: false, error: 'Failed to load questions' };
    }
}
