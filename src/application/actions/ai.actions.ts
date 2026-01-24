'use server';

import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';
import { AIService } from '@/application/services/ai.service';

/**
 * Get current AI settings (masked key)
 */
export async function getAiSettingsAction(orgId: string) {
    try {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config) return { success: true, data: null };

        return {
            success: true,
            data: {
                aiEnabled: config.aiEnabled,
                aiProvider: config.aiProvider,
                aiApiKey: config.aiApiKey ? '••••••••' + config.aiApiKey.slice(-4) : '',
                aiModel: config.aiModel,
                aiLastTestedAt: config.aiLastTestedAt,
                aiTestStatus: config.aiTestStatus
            }
        };
    } catch (error) {
        return { success: false, error: "Failed to fetch AI settings" };
    }
}

/**
 * Save AI Configuration
 */
export async function saveAiConfigAction(
    orgId: string,
    data: {
        enabled: boolean;
        provider: 'GEMINI' | 'OPENAI' | 'CLAUDE' | 'MISTRAL';
        apiKey?: string;
        model?: string;
    }
) {
    try {
        const existing = await prisma.integrationConfig.findUnique({ where: { organisationId: orgId } });

        let finalKey = existing?.aiApiKey;

        // Encrypt if changed (and not mask)
        if (data.apiKey && !data.apiKey.startsWith('••••')) {
            finalKey = encrypt(data.apiKey);
        }

        await prisma.integrationConfig.upsert({
            where: { organisationId: orgId },
            update: {
                aiEnabled: data.enabled,
                aiProvider: data.provider,
                aiApiKey: finalKey,
                aiModel: data.model
            },
            create: {
                organisationId: orgId,
                aiEnabled: data.enabled,
                aiProvider: data.provider,
                aiApiKey: finalKey,
                aiModel: data.model
            }
        });

        revalidatePath('/app/settings/integrations');
        return { success: true };
    } catch (error) {
        console.error("Save AI Config Error:", error);
        return { success: false, error: "Failed to save configuration" };
    }
}

/**
 * Test AI Connection
 */
export async function testAiConnectionAction(orgId: string) {
    try {
        const res = await AIService.testConnection(orgId);

        await prisma.integrationConfig.update({
            where: { organisationId: orgId },
            data: {
                aiLastTestedAt: new Date(),
                aiTestStatus: res.success ? 'success' : 'failed'
            }
        });

        revalidatePath('/app/settings/integrations');
        return res;
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
/**
 * Generate a personalized outreach message based on lead context
 */
export async function generatePersonalizedMessageAction(orgId: string, leadId: string, channel: string) {
    try {
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: {
                exam: true,
                activities: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        });

        if (!lead) throw new Error("Lead introuvable");

        const systemPrompt = `Tu es un expert en conversion de leads pour Polyx Academy. 
Ton objectif est de rédiger un message de relance court (max 300 caractères), percutant et ultra-personnalisé pour ${channel}.
Le message doit être en français, professionnel mais chaleureux.
N'utilise pas de placeholders comme [Nom], remplace-les directement par les données fournies.
Retourne uniquement le texte du message, sans commentaire.`;

        const userPrompt = `
LEAD: ${lead.firstName} ${lead.lastName || ''}
PROJET: ${lead.exam?.name || 'Formation professionnelle'}
STATUT: ${lead.jobStatus || 'Inconnu'}
DERNIERS ÉCHANGES:
${lead.activities.map(a => `- ${a.content}`).join('\n')}

Génère un message pour ${channel}.`;

        const res = await AIService.prompt(orgId, systemPrompt, userPrompt);

        if (res.success && res.text) {
            // Clean up any potential markdown garbage
            const cleanText = res.text.replace(/^["']|["']$/g, '').trim();
            return { success: true, data: cleanText };
        } else {
            return { success: false, error: res.error || "Échec de génération" };
        }
    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return { success: false, error: error.message };
    }
}
