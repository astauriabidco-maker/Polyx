'use server';

import { prisma } from '@/lib/prisma';
import { CefrLevel, SectionType, QuestionType, ReviewStatus } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuestionInput {
    sectionType: SectionType;
    level: CefrLevel;
    content: string;
    questionType?: QuestionType;

    // For MCQ
    choices?: { text: string; isCorrect: boolean }[];

    // For Reading
    passageText?: string;

    // For Listening
    audioScript?: string;

    // For Expression (WRITING/SPEAKING)
    subSection?: 'A' | 'B';
    promptText?: string;
    minWords?: number;
    duration?: number;
    objectives?: string[];

    // Metadata
    tags?: string;
}

export interface ImportRow {
    sectionType: string;
    level: string;
    subSection?: string;
    content: string;
    choiceA?: string;
    choiceB?: string;
    choiceC?: string;
    choiceD?: string;
    correctIndex?: number;
    passageText?: string;
    audioScript?: string;
    minWords?: number;
    duration?: number;
    objectives?: string;
    tags?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE QUESTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function createQuestionAction(orgId: string, input: QuestionInput) {
    try {
        // Build choices array and find correct index
        let choices: any[] = [];
        let correctIndex = 0;

        if (input.choices && input.choices.length > 0) {
            choices = input.choices.map(c => ({ text: c.text, isCorrect: c.isCorrect }));
            correctIndex = choices.findIndex(c => c.isCorrect);
            if (correctIndex === -1) correctIndex = 0;
        }

        const question = await prisma.question.create({
            data: {
                content: input.content,
                level: input.level,
                sectionType: input.sectionType,
                questionType: input.questionType || (input.choices?.length ? 'MCQ' : 'OPEN_TEXT'),
                choices: choices,
                correctIndex: correctIndex,

                // Reading
                passageText: input.passageText || null,

                // Listening
                audioScript: input.audioScript || null,

                // Expression
                subSection: input.subSection || null,
                promptText: input.promptText || null,
                minWords: input.minWords || null,
                duration: input.duration || null,
                objectives: input.objectives || null,

                // Metadata
                tags: input.tags || null,
                isActive: true,
                status: 'DRAFT'
            }
        });

        return { success: true, data: question };
    } catch (error) {
        console.error('[createQuestionAction] Error:', error);
        return { success: false, error: 'Failed to create question' };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE QUESTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function updateQuestionAction(questionId: string, orgId: string, input: Partial<QuestionInput>) {
    try {
        const updateData: any = {};

        if (input.content !== undefined) updateData.content = input.content;
        if (input.level !== undefined) updateData.level = input.level;
        if (input.sectionType !== undefined) updateData.sectionType = input.sectionType;
        if (input.questionType !== undefined) updateData.questionType = input.questionType;
        if (input.passageText !== undefined) updateData.passageText = input.passageText;
        if (input.audioScript !== undefined) updateData.audioScript = input.audioScript;
        if (input.subSection !== undefined) updateData.subSection = input.subSection;
        if (input.promptText !== undefined) updateData.promptText = input.promptText;
        if (input.minWords !== undefined) updateData.minWords = input.minWords;
        if (input.duration !== undefined) updateData.duration = input.duration;
        if (input.objectives !== undefined) updateData.objectives = input.objectives;
        if (input.tags !== undefined) updateData.tags = input.tags;

        if (input.choices) {
            updateData.choices = input.choices.map(c => ({ text: c.text, isCorrect: c.isCorrect }));
            updateData.correctIndex = input.choices.findIndex(c => c.isCorrect);
        }

        const question = await prisma.question.update({
            where: { id: questionId },
            data: updateData
        });

        return { success: true, data: question };
    } catch (error) {
        console.error('[updateQuestionAction] Error:', error);
        return { success: false, error: 'Failed to update question' };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE QUESTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function deleteQuestionAction(questionId: string, orgId: string) {
    try {
        await prisma.question.delete({
            where: { id: questionId }
        });
        return { success: true };
    } catch (error) {
        console.error('[deleteQuestionAction] Error:', error);
        return { success: false, error: 'Failed to delete question' };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT QUESTIONS FROM CSV
// ═══════════════════════════════════════════════════════════════════════════════

export async function importQuestionsAction(orgId: string, rows: ImportRow[]) {
    try {
        const created: any[] = [];
        const errors: { row: number; error: string }[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                // Validate section type
                const validSectionTypes = ['READING', 'LISTENING', 'WRITING', 'SPEAKING', 'GRAMMAR', 'VOCABULARY'];
                if (!validSectionTypes.includes(row.sectionType)) {
                    errors.push({ row: i + 1, error: `Type de section invalide: ${row.sectionType}` });
                    continue;
                }

                // Validate level
                const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
                if (!validLevels.includes(row.level)) {
                    errors.push({ row: i + 1, error: `Niveau invalide: ${row.level}` });
                    continue;
                }

                // Build choices for MCQ
                let choices: any[] = [];
                let correctIndex = 0;

                if (row.choiceA || row.choiceB || row.choiceC || row.choiceD) {
                    const choiceTexts = [row.choiceA, row.choiceB, row.choiceC, row.choiceD].filter(c => c);
                    correctIndex = row.correctIndex !== undefined ? row.correctIndex : 0;
                    choices = choiceTexts.map((text, idx) => ({
                        text: text,
                        isCorrect: idx === correctIndex
                    }));
                }

                // Determine question type
                const isExpression = row.sectionType === 'WRITING' || row.sectionType === 'SPEAKING';
                const questionType = isExpression ? 'OPEN_TEXT' : 'MCQ';

                // Parse objectives if present
                let objectives = null;
                if (row.objectives) {
                    try {
                        objectives = row.objectives.split(';').map(o => o.trim());
                    } catch {
                        objectives = [row.objectives];
                    }
                }

                const question = await prisma.question.create({
                    data: {
                        content: row.content,
                        level: row.level as CefrLevel,
                        sectionType: row.sectionType as SectionType,
                        questionType: questionType as QuestionType,
                        choices: choices,
                        correctIndex: correctIndex,
                        passageText: row.passageText || null,
                        audioScript: row.audioScript || null,
                        subSection: row.subSection || null,
                        promptText: isExpression ? row.content : null,
                        minWords: row.minWords || null,
                        duration: row.duration || null,
                        objectives: objectives,
                        tags: row.tags || null,
                        isActive: true,
                        status: 'DRAFT'
                    }
                });

                created.push(question);
            } catch (rowError: any) {
                errors.push({ row: i + 1, error: rowError.message });
            }
        }

        return {
            success: true,
            imported: created.length,
            errors: errors,
            data: created
        };
    } catch (error) {
        console.error('[importQuestionsAction] Error:', error);
        return { success: false, error: 'Failed to import questions' };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET CSV TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

export async function getImportTemplateAction() {
    const headers = [
        'sectionType',
        'level',
        'subSection',
        'content',
        'choiceA',
        'choiceB',
        'choiceC',
        'choiceD',
        'correctIndex',
        'passageText',
        'audioScript',
        'minWords',
        'duration',
        'objectives',
        'tags'
    ];

    const exampleRows = [
        // QCM Reading example
        'READING,B2,,Quel est le thème principal du texte?,Le voyage,La cuisine,L\'économie,La santé,0,Texte exemple...,,,,,voyage;culture',
        // QCM Listening example
        'LISTENING,B1,,Où se passe la conversation?,Au restaurant,À la gare,À l\'hôpital,À l\'école,1,,Speaker A: Bonjour...,,,tourisme',
        // Expression écrite A
        'WRITING,A2,A,Écrivez un message à un ami pour prendre de ses nouvelles,,,,,,,,40,,Saluer;Demander nouvelles,correspondance',
        // Expression orale B
        'SPEAKING,B2,B,Aidez votre ami(e) à choisir entre deux appartements,,,,,,,,,6,Écouter;Conseiller;Conclure,logement'
    ];

    const csv = headers.join(',') + '\n' + exampleRows.join('\n');

    return { success: true, csv };
}
