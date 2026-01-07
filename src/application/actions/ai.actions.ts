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
        provider: 'GEMINI' | 'OPENAI';
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
