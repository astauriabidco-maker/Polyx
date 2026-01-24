'use server';

import { AIService } from '@/application/services/ai.service';
import { prisma } from '@/lib/prisma';
import { CefrLevel, SectionType } from '@prisma/client';

export interface GenerationParams {
    sectionType: SectionType;
    level: CefrLevel;
    themeIds: string[];
    orgId: string;
}

export async function generateContentWithAI(params: GenerationParams) {
    const { sectionType, level, themeIds, orgId } = params;

    // Fetch Themes Context
    const themes = await prisma.assessmentTheme.findMany({
        where: { id: { in: themeIds } }
    });

    // Construct rich context from themes
    const themesContext = themes.map(t => `${t.name}: ${t.description || ''}`).join('; ');
    const topicLabel = themes.map(t => t.name).join(', ');

    let systemPrompt = '';
    let userPrompt = '';

    // Define prompts based on Section Type
    switch (sectionType) {
        case 'READING':
            systemPrompt = `You are an expert language assessment creator. Generate a unique READING text and 3 logical Multiple Choice Questions (MCQ) testing comprehension. 
            CONTEXT/THEMES: ${themesContext}
            
            Format STRICTLY as JSON:
            {
                "passageText": "The text content (approx 150 words)...",
                "questions": [
                    { "content": "Question text?", "choices": [{"text": "A", "isCorrect": false}, {"text": "B", "isCorrect": true}, ...], "level": "${level}" }
                ]
            }`;
            userPrompt = `Level: ${level}. Focus Themes: ${topicLabel}. Language: French (Learner context).`;
            break;

        case 'LISTENING':
            systemPrompt = `You are an expert language assessment creator. Generate a spoken dialogue script and 3 logical Multiple Choice Questions (MCQ).
            CONTEXT/THEMES: ${themesContext}

            Format STRICTLY as JSON:
            {
                "audioScript": "Speaker A: ... Speaker B: ...",
                "questions": [
                    { "content": "Question text?", "choices": [{"text": "A", "isCorrect": false}, {"text": "B", "isCorrect": true}, ...], "level": "${level}" }
                ]
            }`;
            userPrompt = `Level: ${level}. Focus Themes: ${topicLabel}. Language: French (Oral style).`;
            break;

        case 'GRAMMAR':
        case 'VOCABULARY':
            systemPrompt = `You are an expert language assessment creator. Generate 5 distinct sentences with gaps testing specific grammar/vocabulary points.
            CONTEXT/THEMES: ${themesContext}

            Format STRICTLY as JSON:
            {
                "questions": [
                    { "content": "Sentence with ___ gap.", "choices": [{"text": "wrong", "isCorrect": false}, {"text": "correct", "isCorrect": true}, ...], "level": "${level}" }
                ]
            }`;
            userPrompt = `Level: ${level}. Focus Themes: ${topicLabel}. Focus: ${sectionType}. Language: French.`;
            break;

        default:
            return { success: false, error: 'Unsupported section type' };
    }

    try {
        // Call AI Service
        const result = await AIService.prompt(orgId, systemPrompt, userPrompt);

        if (!result.success || !result.text) {
            throw new Error(result.error || 'AI generation failed');
        }

        // Parse JSON safely
        const jsonStr = result.text.replace(/```json\n?|\n?```/g, '');
        const data = JSON.parse(jsonStr);

        // Save to Database
        const questions = [];

        // Common context
        const passageText = data.passageText || null;
        const audioScript = data.audioScript || null;

        for (const q of data.questions) {
            const created = await prisma.question.create({
                data: {
                    content: q.content,
                    choices: q.choices,
                    level: level,
                    correctIndex: q.choices.findIndex((c: any) => c.isCorrect),
                    questionType: 'MCQ', // Defaulting to MCQ for now as per prompt instructions
                    sectionType: sectionType,
                    passageText: passageText,
                    audioScript: audioScript,
                    tags: topicLabel, // Storing topic label as tag
                    isActive: true
                }
            });
            questions.push(created);
        }

        return { success: true, count: questions.length, questions };

    } catch (error) {
        console.error('AI Content Generation Error:', error);
        return { success: false, error: 'Failed to generate content' };
    }
}
