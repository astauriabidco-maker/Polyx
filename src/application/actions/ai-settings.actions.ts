'use server';

import { prisma } from '@/lib/prisma';
import { encrypt, decrypt, maskSensitive } from '@/lib/crypto';
import { AIService } from '@/application/services/ai.service';
import { revalidatePath } from 'next/cache';

/**
 * Retrieves the current AI configuration for an organization
 */
export async function getAIConfigAction(organisationId: string) {
    try {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId }
        });

        if (!config) {
            return {
                success: true,
                config: {
                    aiEnabled: false,
                    aiProvider: 'GEMINI',
                    aiModel: '',
                    aiApiKeyMasked: ''
                }
            };
        }

        let maskedKey = '';
        if (config.aiApiKey) {
            try {
                const decrypted = decrypt(config.aiApiKey);
                maskedKey = maskSensitive(decrypted);
            } catch (e) {
                maskedKey = 'Error decrypting key';
            }
        }

        return {
            success: true,
            config: {
                aiEnabled: config.aiEnabled,
                aiProvider: config.aiProvider || 'GEMINI',
                aiModel: config.aiModel || '',
                aiApiKeyMasked: maskedKey
            }
        };

    } catch (error: any) {
        console.error('Get AI Config Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Updates the AI configuration
 */
export async function updateAIConfigAction(organisationId: string, data: {
    aiEnabled: boolean;
    aiProvider: string;
    aiModel: string;
    aiApiKey?: string; // Optional, only if updating
}) {
    try {
        const updateData: any = {
            aiEnabled: data.aiEnabled,
            aiProvider: data.aiProvider,
            aiModel: data.aiModel
        };

        // Only update API key if a new one is provided
        if (data.aiApiKey && data.aiApiKey.trim().length > 0) {
            updateData.aiApiKey = encrypt(data.aiApiKey);
        }

        await prisma.integrationConfig.upsert({
            where: { organisationId },
            update: updateData,
            create: {
                organisationId,
                ...updateData
            }
        });

        revalidatePath('/app/settings/organization');
        return { success: true };

    } catch (error: any) {
        console.error('Update AI Config Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Tests the AI connection with the currently saved configuration
 */
export async function testAIConnectionAction(organisationId: string) {
    try {
        const result = await AIService.testConnection(organisationId);
        return result;
    } catch (error: any) {
        console.error('Test AI Connection Error:', error);
        return { success: false, error: error.message };
    }
}
