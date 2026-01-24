'use server';

import { AIService } from '@/application/services/ai.service';
import { prisma } from '@/lib/prisma';
import { CefrLevel, SectionType, QuestionType } from '@prisma/client';

export interface GenerationParams {
    sectionType: SectionType;
    questionType: QuestionType;
    level: CefrLevel;
    themeIds: string[];
    orgId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDERS FOR EACH QUESTION TYPE
// ═══════════════════════════════════════════════════════════════════════════════

function buildPromptForQuestionType(
    questionType: QuestionType,
    sectionType: SectionType,
    level: CefrLevel,
    themesContext: string,
    topicLabel: string
): { systemPrompt: string; userPrompt: string } {

    const baseContext = `
Tu es un expert en création d'évaluations linguistiques FLE (Français Langue Étrangère).
CONTEXTE/THÉMATIQUES: ${themesContext}
NIVEAU CECRL: ${level}
FORMAT: Retourne STRICTEMENT du JSON valide sans commentaires.`;

    switch (questionType) {
        // ══════════════════════════════════════════════════════════════════════
        // QCM - Questions à choix multiples
        // ══════════════════════════════════════════════════════════════════════
        case 'MCQ':
            if (sectionType === 'READING') {
                return {
                    systemPrompt: `${baseContext}
Génère un texte de lecture et 3 questions QCM de compréhension.
FORMAT JSON:
{
    "passageText": "Texte de ~150 mots...",
    "questions": [
        { "content": "Question?", "choices": [{"text": "Option A", "isCorrect": false}, {"text": "Option B", "isCorrect": true}, {"text": "Option C", "isCorrect": false}, {"text": "Option D", "isCorrect": false}] }
    ]
}`,
                    userPrompt: `Thèmes: ${topicLabel}. Langue: Français.`
                };
            }
            if (sectionType === 'LISTENING') {
                return {
                    systemPrompt: `${baseContext}
Génère un dialogue audio et 3 questions QCM de compréhension orale.
FORMAT JSON:
{
    "audioScript": "Locuteur A: ... Locuteur B: ...",
    "questions": [
        { "content": "Question?", "choices": [{"text": "Option A", "isCorrect": false}, {"text": "Option B", "isCorrect": true}, {"text": "Option C", "isCorrect": false}, {"text": "Option D", "isCorrect": false}] }
    ]
}`,
                    userPrompt: `Thèmes: ${topicLabel}. Style oral naturel.`
                };
            }
            // Default MCQ for Grammar/Vocabulary
            return {
                systemPrompt: `${baseContext}
Génère 5 questions QCM pour tester ${sectionType === 'GRAMMAR' ? 'la grammaire' : 'le vocabulaire'}.
FORMAT JSON:
{
    "questions": [
        { "content": "Phrase ou question?", "choices": [{"text": "option", "isCorrect": false}, {"text": "bonne réponse", "isCorrect": true}, ...] }
    ]
}`,
                userPrompt: `Thèmes: ${topicLabel}. Focus: ${sectionType}.`
            };

        // ══════════════════════════════════════════════════════════════════════
        // BOOLEAN - Vrai/Faux
        // ══════════════════════════════════════════════════════════════════════
        case 'BOOLEAN':
            return {
                systemPrompt: `${baseContext}
Génère 5 affirmations Vrai/Faux en lien avec ${sectionType === 'READING' ? 'un texte de lecture' : 'les thèmes'}.
${sectionType === 'READING' ? 'Inclus un "passageText" de ~150 mots.' : ''}
FORMAT JSON:
{
    ${sectionType === 'READING' ? '"passageText": "Le texte...",' : ''}
    "questions": [
        { "content": "Affirmation à juger vraie ou fausse.", "isTrue": true },
        { "content": "Autre affirmation.", "isTrue": false }
    ]
}`,
                userPrompt: `Thèmes: ${topicLabel}. Mélange d'affirmations vraies et fausses.`
            };

        // ══════════════════════════════════════════════════════════════════════
        // GAP_FILL - Texte à trous
        // ══════════════════════════════════════════════════════════════════════
        case 'GAP_FILL':
            return {
                systemPrompt: `${baseContext}
Génère 5 phrases à trous pour tester ${sectionType === 'GRAMMAR' ? 'la grammaire' : sectionType === 'VOCABULARY' ? 'le vocabulaire' : 'la compréhension'}.
Utilise "___" pour les espaces vides.
FORMAT JSON:
{
    "questions": [
        { "content": "Compléter la phrase suivante:", "gapText": "Je ___ au marché hier.", "answers": ["suis allé", "suis allée"] },
        { "content": "Compléter:", "gapText": "Elle ___ très contente.", "answers": ["est"] }
    ]
}`,
                userPrompt: `Thèmes: ${topicLabel}. Variez la difficulté.`
            };

        // ══════════════════════════════════════════════════════════════════════
        // SHORT_ANSWER - Réponse courte
        // ══════════════════════════════════════════════════════════════════════
        case 'SHORT_ANSWER':
            return {
                systemPrompt: `${baseContext}
Génère 5 questions à réponse courte (1-3 mots max).
FORMAT JSON:
{
    "questions": [
        { "content": "Question demandant une réponse courte?", "correctAnswer": "réponse" },
        { "content": "Conjuguez 'aller' à la 1ère personne du singulier au présent.", "correctAnswer": "vais" }
    ]
}`,
                userPrompt: `Thèmes: ${topicLabel}. Focus: ${sectionType}.`
            };

        // ══════════════════════════════════════════════════════════════════════
        // MATCHING - Appariement
        // ══════════════════════════════════════════════════════════════════════
        case 'MATCHING':
            return {
                systemPrompt: `${baseContext}
Génère un exercice d'appariement avec 5-6 paires à relier.
FORMAT JSON:
{
    "questions": [
        {
            "content": "Reliez les éléments de gauche avec ceux de droite.",
            "pairs": [
                { "left": "Bonjour", "right": "Salutation formelle" },
                { "left": "Salut", "right": "Salutation informelle" },
                { "left": "Bonsoir", "right": "Salutation du soir" }
            ]
        }
    ]
}`,
                userPrompt: `Thèmes: ${topicLabel}. Créer des associations logiques.`
            };

        // ══════════════════════════════════════════════════════════════════════
        // ORDERING - Réordonnancement
        // ══════════════════════════════════════════════════════════════════════
        case 'ORDERING':
            return {
                systemPrompt: `${baseContext}
Génère 2-3 exercices de réordonnancement (phrases/paragraphes à remettre dans l'ordre).
FORMAT JSON:
{
    "questions": [
        {
            "content": "Remettez les phrases dans l'ordre logique.",
            "orderedItems": ["Première phrase", "Deuxième phrase", "Troisième phrase", "Quatrième phrase"]
        }
    ]
}`,
                userPrompt: `Thèmes: ${topicLabel}. Ordre chronologique ou logique.`
            };

        // ══════════════════════════════════════════════════════════════════════
        // OPEN_TEXT - Expression écrite/orale
        // ══════════════════════════════════════════════════════════════════════
        case 'OPEN_TEXT':
            if (sectionType === 'WRITING') {
                return {
                    systemPrompt: `${baseContext}
Génère 2 sujets d'expression écrite:
- Section A: "Prendre des nouvelles" (~40 mots minimum)
- Section B: "Argumentation" (~100 mots minimum)
FORMAT JSON:
{
    "sectionA": {
        "promptText": "Consigne détaillée...",
        "context": "Contexte de situation...",
        "minWords": 40,
        "objectives": ["Saluer", "Demander des nouvelles"]
    },
    "sectionB": {
        "promptText": "Consigne détaillée...",
        "context": "Contexte...",
        "minWords": 100,
        "objectives": ["Exprimer son opinion", "Argumenter"]
    }
}`,
                    userPrompt: `Thèmes: ${topicLabel}. Situations réalistes du quotidien.`
                };
            }
            // SPEAKING
            return {
                systemPrompt: `${baseContext}
Génère 2 sujets d'expression orale:
- Section A: "Appel téléphonique" (3-4 min)
- Section B: "Conseil à un ami" (5-7 min)
FORMAT JSON:
{
    "sectionA": {
        "scenario": "Description de la situation...",
        "promptText": "Consigne pour l'apprenant...",
        "duration": 4,
        "objectives": ["Se présenter", "Demander des informations"]
    },
    "sectionB": {
        "scenario": "Description...",
        "promptText": "Consigne...",
        "duration": 6,
        "objectives": ["Écouter", "Conseiller"]
    }
}`,
                userPrompt: `Thèmes: ${topicLabel}. Conversations naturelles.`
            };

        // ══════════════════════════════════════════════════════════════════════
        // AUDIO_DICTATION - Dictée
        // ══════════════════════════════════════════════════════════════════════
        case 'AUDIO_DICTATION':
            return {
                systemPrompt: `${baseContext}
Génère 3 textes courts pour dictée (2-4 phrases chacun).
FORMAT JSON:
{
    "questions": [
        { "content": "Dictée n°1", "audioScript": "Texte à dicter lentement et clairement." },
        { "content": "Dictée n°2", "audioScript": "Un autre texte pour la dictée." }
    ]
}`,
                userPrompt: `Thèmes: ${topicLabel}. Textes clairs, prononciation soignée.`
            };

        default:
            return {
                systemPrompt: `${baseContext}
Génère des questions de type ${questionType}.`,
                userPrompt: `Thèmes: ${topicLabel}.`
            };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GENERATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateContentWithAI(params: GenerationParams) {
    const { sectionType, questionType, level, themeIds, orgId } = params;

    // Fetch Themes Context
    const themes = await prisma.assessmentTheme.findMany({
        where: { id: { in: themeIds } }
    });

    // Build enriched context from themes
    const themesContext = themes.map(t => {
        const parts = [t.name];
        if (t.description) parts.push(`Description: ${t.description}`);
        if (t.keyVocabulary) parts.push(`Vocabulaire: ${t.keyVocabulary}`);
        if (t.situations) parts.push(`Situations: ${t.situations}`);
        if (t.styleNotes) parts.push(`Style: ${t.styleNotes}`);
        return parts.join(' | ');
    }).join('; ');

    const topicLabel = themes.map(t => t.name).join(', ');

    // Build prompts based on question type
    const { systemPrompt, userPrompt } = buildPromptForQuestionType(
        questionType,
        sectionType,
        level,
        themesContext,
        topicLabel
    );

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

        // ═══════════════════════════════════════════════════════════════════
        // HANDLE EXPRESSION TYPES (OPEN_TEXT with sections A/B)
        // ═══════════════════════════════════════════════════════════════════
        if (questionType === 'OPEN_TEXT' && (sectionType === 'WRITING' || sectionType === 'SPEAKING')) {
            if (data.sectionA) {
                const createdA = await prisma.question.create({
                    data: {
                        content: data.sectionA.promptText || `Section A - ${sectionType}`,
                        choices: [],
                        level: level,
                        correctIndex: 0,
                        questionType: 'OPEN_TEXT',
                        sectionType: sectionType,
                        subSection: 'A',
                        promptText: data.sectionA.promptText,
                        minWords: data.sectionA.minWords || null,
                        duration: data.sectionA.duration || null,
                        objectives: data.sectionA.objectives || [],
                        passageText: data.sectionA.context || data.sectionA.scenario || null,
                        tags: topicLabel,
                        isActive: true
                    }
                });
                questions.push(createdA);
            }

            if (data.sectionB) {
                const createdB = await prisma.question.create({
                    data: {
                        content: data.sectionB.promptText || `Section B - ${sectionType}`,
                        choices: [],
                        level: level,
                        correctIndex: 0,
                        questionType: 'OPEN_TEXT',
                        sectionType: sectionType,
                        subSection: 'B',
                        promptText: data.sectionB.promptText,
                        minWords: data.sectionB.minWords || null,
                        duration: data.sectionB.duration || null,
                        objectives: data.sectionB.objectives || [],
                        passageText: data.sectionB.context || data.sectionB.scenario || null,
                        tags: topicLabel,
                        isActive: true
                    }
                });
                questions.push(createdB);
            }
        }
        // ═══════════════════════════════════════════════════════════════════
        // HANDLE ALL OTHER QUESTION TYPES
        // ═══════════════════════════════════════════════════════════════════
        else if (data.questions && Array.isArray(data.questions)) {
            const passageText = data.passageText || null;
            const audioScript = data.audioScript || null;

            for (const q of data.questions) {
                let choices: any = [];
                let correctIndex = 0;

                // Build choices based on question type
                switch (questionType) {
                    case 'MCQ':
                        choices = q.choices || [];
                        correctIndex = choices.findIndex((c: any) => c.isCorrect);
                        break;

                    case 'BOOLEAN':
                        choices = [
                            { text: 'Vrai', isCorrect: q.isTrue === true },
                            { text: 'Faux', isCorrect: q.isTrue === false }
                        ];
                        correctIndex = q.isTrue ? 0 : 1;
                        break;

                    case 'GAP_FILL':
                        choices = (q.answers || []).map((a: string) => ({ text: a, isCorrect: true }));
                        break;

                    case 'SHORT_ANSWER':
                        choices = [{ text: q.correctAnswer || '', isCorrect: true }];
                        break;

                    case 'MATCHING':
                        choices = q.pairs || [];
                        break;

                    case 'ORDERING':
                        choices = (q.orderedItems || []).map((item: string, idx: number) => ({ text: item, order: idx }));
                        break;

                    case 'AUDIO_DICTATION':
                        choices = [{ text: q.audioScript || '', isCorrect: true }];
                        break;

                    default:
                        choices = q.choices || [];
                }

                const created = await prisma.question.create({
                    data: {
                        content: q.content,
                        choices: choices,
                        level: level,
                        correctIndex: correctIndex,
                        questionType: questionType,
                        sectionType: sectionType,
                        passageText: passageText || q.gapText || null,
                        audioScript: audioScript || q.audioScript || null,
                        tags: topicLabel,
                        isActive: true
                    }
                });
                questions.push(created);
            }
        }

        return { success: true, count: questions.length, questions };

    } catch (error) {
        console.error('AI Content Generation Error:', error);
        return { success: false, error: 'Failed to generate content' };
    }
}
