import { prisma } from '@/lib/prisma';
import { CefrLevel, AssessmentSession } from '@prisma/client';

export class AssessmentEngine {

    /**
     * Maps a CEFR level to an integer (0-6) for gap calculation.
     */
    static getLevelIndex(level: CefrLevel): number {
        const order = [
            CefrLevel.A1_1, // 0
            CefrLevel.A1,   // 1
            CefrLevel.A2,   // 2
            CefrLevel.B1,   // 3
            CefrLevel.B2,   // 4
            CefrLevel.C1,   // 5
            CefrLevel.C2    // 6
        ];
        return order.indexOf(level);
    }

    /**
     * Determines result level based on percentage score.
     */
    static determineLevelFromScore(score: number): CefrLevel {
        if (score < 20) return CefrLevel.A1_1;
        if (score < 40) return CefrLevel.A1;
        if (score < 60) return CefrLevel.A2;
        if (score < 80) return CefrLevel.B1;
        if (score < 95) return CefrLevel.B2;
        return CefrLevel.C1; // C2 is reserved for specialized expert tests usually
    }

    /**
     * Main engine function: Validates answers, calculates score, level, gap,
     * updates the session, and writes the prescription to the Lead's notes.
     */
    static async calculateGapAndPrescribe(sessionId: string, rawAnswers: Record<string, number>) {
        // 1. Fetch Session & Config
        const session = await prisma.assessmentSession.findUnique({
            where: { id: sessionId },
            include: { lead: true }
        });
        if (!session) throw new Error("Session not found");

        const config = await prisma.assessmentConfig.findFirst();
        const hoursPerLevel = config?.hoursPerLevel || 80;

        // 2. Evaluate Answers
        const questionIds = Object.keys(rawAnswers);
        const questions = await prisma.question.findMany({
            where: { id: { in: questionIds } }
        });

        const processedAnswers = questions.map(q => ({
            questionId: q.id,
            isCorrect: q.correctIndex === rawAnswers[q.id],
            level: q.level
        }));

        const total = processedAnswers.length;
        const correct = processedAnswers.filter(a => a.isCorrect).length;
        const score = total > 0 ? Math.round((correct / total) * 100) : 0;

        // 3. Determine Result Level
        const resultLevel = this.determineLevelFromScore(score);

        // 4. Calculate Gap (Integer Math)
        const targetInt = this.getLevelIndex(session.targetLevel);
        const resultInt = this.getLevelIndex(resultLevel);

        // Gap is strictly Target - Result. If result > target, gap is 0 or negative (no hours needed).
        const levelGap = Math.max(0, targetInt - resultInt);

        let recommendedHours = 0;
        if (levelGap > 0) {
            recommendedHours = levelGap * hoursPerLevel;
        }

        // 5. Prescribe text
        const prescriptionText = `
[EVALUATION DU ${new Date().toLocaleDateString()}]
Score: ${score}% (${correct}/${total})
Niveau évalué: ${resultLevel} (Objectif: ${session.targetLevel})
Écart constaté: ${levelGap} niveaux
Prescription: ${recommendedHours} heures de formation.
        `.trim();

        // 6. Update Session
        const updatedSession = await prisma.assessmentSession.update({
            where: { id: sessionId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                resultLevel,
                score,
                recommendedHours,
                recommendation: prescriptionText,
                answers: processedAnswers as any
            }
        });

        // Append to existing notes or create new
        const currentNotes = (session.lead as any).notes || "";
        const separator = currentNotes ? "\n---\n" : "";
        const updatedNotes = currentNotes + separator + prescriptionText;

        await prisma.lead.update({
            where: { id: session.leadId },
            data: {
                notes: updatedNotes,
                metadata: {
                    ...(typeof session.lead.metadata === 'object' && session.lead.metadata !== null ? session.lead.metadata : {}),
                    last_assessment: {
                        date: new Date(),
                        level: resultLevel,
                        hours: recommendedHours,
                        prescription: prescriptionText
                    }
                }
            }
        });

        return updatedSession;
    }
}
