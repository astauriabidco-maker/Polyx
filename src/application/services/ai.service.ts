/**
 * AI Service for Polyx
 * Supports Gemini and OpenAI providers with configurable models.
 */
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

type AIProvider = 'GEMINI' | 'OPENAI';

interface AIConfig {
    provider: AIProvider;
    apiKey: string;
    model: string;
}

export class AIService {

    /**
     * Fetches the AI configuration for an organization
     */
    private static async getConfig(orgId: string): Promise<AIConfig | null> {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config || !config.aiEnabled || !config.aiApiKey) {
            return null;
        }

        return {
            provider: (config.aiProvider as AIProvider) || 'GEMINI',
            apiKey: decrypt(config.aiApiKey),
            model: config.aiModel || (config.aiProvider === 'OPENAI' ? 'gpt-4o-mini' : 'gemini-1.5-flash')
        };
    }

    /**
     * Generic prompt execution
     */
    static async prompt(orgId: string, systemPrompt: string, userPrompt: string): Promise<{ success: boolean; text?: string; error?: string }> {
        const config = await this.getConfig(orgId);

        if (!config) {
            console.warn('[AIService] No AI config found, using mock.');
            return { success: true, text: `[MOCK AI] Response to: "${userPrompt.substring(0, 50)}..."` };
        }

        try {
            if (config.provider === 'GEMINI') {
                return await this.callGemini(config.apiKey, config.model, systemPrompt, userPrompt);
            } else if (config.provider === 'OPENAI') {
                return await this.callOpenAI(config.apiKey, config.model, systemPrompt, userPrompt);
            }
            return { success: false, error: 'Unknown provider' };
        } catch (error: any) {
            console.error('[AIService] Error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Call Gemini API
     */
    private static async callGemini(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Gemini API Error');
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { success: true, text };
    }

    /**
     * Call OpenAI API
     */
    private static async callOpenAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
        const url = 'https://api.openai.com/v1/chat/completions';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'OpenAI API Error');
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        return { success: true, text };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // HIGH-LEVEL METHODS (Used by other services)
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Analyzes feedback text
     */
    static async analyzeFeedback(orgId: string, text: string) {
        const systemPrompt = `Tu es un assistant IA pour un centre de formation. Analyse le retour d'un apprenant et retourne en JSON:
{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "tags": ["Pédagogie", "Technique", ...],
  "summary": "Résumé en une phrase"
}`;

        const result = await this.prompt(orgId, systemPrompt, text);

        if (!result.success || !result.text) {
            // Fallback to heuristics
            return this.fallbackFeedbackAnalysis(text);
        }

        try {
            return JSON.parse(result.text.replace(/```json\n?|\n?```/g, ''));
        } catch {
            return this.fallbackFeedbackAnalysis(text);
        }
    }

    private static fallbackFeedbackAnalysis(text: string) {
        const lower = text.toLowerCase();
        let sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = 'NEUTRAL';
        if (lower.includes('super') || lower.includes('parfait') || lower.includes('merci')) sentiment = 'POSITIVE';
        if (lower.includes('difficile') || lower.includes('problème') || lower.includes('déçu')) sentiment = 'NEGATIVE';

        const tags = [];
        if (lower.includes('cours') || lower.includes('contenu')) tags.push('Pédagogie');
        if (lower.includes('admin') || lower.includes('dossier')) tags.push('Administration');

        return { sentiment, tags: tags.length ? tags : ['Général'], summary: text.substring(0, 50) };
    }

    /**
     * Generates a strategic executive summary
     */
    static async generateStrategicSummary(orgId: string, metrics: { projectedRevenue: number; currentPipeline: number; riskScore: number }) {
        const systemPrompt = `Tu es un conseiller stratégique pour un organisme de formation professionnelle. Génère un résumé exécutif de 3-4 phrases basé sur les données financières et opérationnelles fournies. Sois factuel et orienté action.`;
        const userPrompt = `Données: CA Projeté: ${metrics.projectedRevenue}€, Pipeline Actuel: ${metrics.currentPipeline}€, Score Risque: ${metrics.riskScore}%`;

        const result = await this.prompt(orgId, systemPrompt, userPrompt);

        return {
            summary: result.success ? result.text : `La trajectoire de croissance est ${metrics.projectedRevenue > metrics.currentPipeline ? 'haussière' : 'prudente'}.`,
            recommendations: [
                "Renforcer le suivi pédagogique",
                "Accélérer la conversion B2B",
                "Préparer l'audit Qualiopi"
            ]
        };
    }

    /**
     * Generates a training program outline
     */
    static async generateProgramOutline(orgId: string, topic: string, duration: string, level: string) {
        const systemPrompt = `Tu es un ingénieur pédagogique expert en formation professionnelle. Génère un programme de formation structuré en JSON:
{
  "title": "Titre",
  "objectives": ["Objectif 1", ...],
  "modules": [
    { "title": "Module 1", "duration": "2h", "topics": ["Topic A", ...] }
  ],
  "evaluations": ["Évaluation 1", ...]
}`;
        const userPrompt = `Crée un programme pour: "${topic}" (Durée: ${duration}, Niveau: ${level})`;

        const result = await this.prompt(orgId, systemPrompt, userPrompt);

        if (result.success && result.text) {
            try {
                return JSON.parse(result.text.replace(/```json\n?|\n?```/g, ''));
            } catch {
                return null;
            }
        }
        return null;
    }

    /**
     * Test connection with a simple prompt
     */
    static async testConnection(orgId: string): Promise<{ success: boolean; response?: string; error?: string }> {
        const result = await this.prompt(orgId, 'Réponds uniquement par "Polyx OK" sans rien d\'autre.', 'Test de connexion');
        return {
            success: result.success,
            response: result.text,
            error: result.error
        };
    }
}
