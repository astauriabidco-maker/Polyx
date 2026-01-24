'use server';

import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';
import { EmailService, EmailProvider } from '@/application/services/email.service';

/**
 * Get current email settings (masked key)
 */
export async function getEmailSettingsAction(orgId: string) {
    try {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config) return { success: true, data: null };

        // Mask API Key
        const maskedKey = config.emailApiKey
            ? '••••••••' + config.emailApiKey.slice(-4)
            : '';

        return {
            success: true,
            data: {
                emailEnabled: config.emailEnabled,
                emailProvider: config.emailProvider,
                emailApiKey: config.emailApiKey ? '••••••••' : '',
                emailFromAddress: config.emailFromAddress,
                emailFromName: config.emailFromName,
                emailSmtpConfig: config.emailSmtpConfig, // Return SMTP config
                lastTestedAt: config.emailLastTestedAt,
                testStatus: config.emailTestStatus
            }
        };
    } catch (error) {
        return { success: false, error: "Failed to fetch settings" };
    }
}

/**
 * Save Email Configuration
 */
export async function saveEmailConfigAction(
    orgId: string,
    data: {
        enabled: boolean;
        provider: EmailProvider;
        apiKey?: string; // Optional if not changing
        fromAddress: string;
        fromName: string;
        smtpConfig?: {
            host: string;
            port: string;
            user: string;
        }
    }
) {
    try {
        // Fetch existing logic to handle "don't overwrite with dots"
        const existing = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        let finalApiKey = existing?.emailApiKey;

        // If new key provided (not dots), encrypt it
        if (data.apiKey && !data.apiKey.startsWith('••••')) {
            finalApiKey = encrypt(data.apiKey);
        }

        const smtpConfigData = data.provider === 'SMTP' ? data.smtpConfig : undefined;

        await prisma.integrationConfig.upsert({
            where: { organisationId: orgId },
            update: {
                emailEnabled: data.enabled,
                emailProvider: data.provider,
                emailApiKey: finalApiKey,
                emailFromAddress: data.fromAddress,
                emailFromName: data.fromName,
                emailSmtpConfig: smtpConfigData as any
            },
            create: {
                organisationId: orgId,
                emailEnabled: data.enabled,
                emailProvider: data.provider,
                emailApiKey: finalApiKey,
                emailFromAddress: data.fromAddress,
                emailFromName: data.fromName,
                emailSmtpConfig: smtpConfigData as any
            }
        });

        revalidatePath('/app/settings/integrations');
        return { success: true };
    } catch (error) {
        console.error("Save Email Config Error:", error);
        return { success: false, error: "Failed to save configuration" };
    }
}

/**
 * Test Connection (Send Test Email)
 */
export async function testEmailConnectionAction(orgId: string, testEmailTo: string) {
    try {
        // 1. Send test email
        const res = await EmailService.testConnection(orgId, testEmailTo);

        // 2. Update status
        await prisma.integrationConfig.update({
            where: { organisationId: orgId },
            data: {
                emailLastTestedAt: new Date(),
                emailTestStatus: res.success ? 'success' : 'failed'
            }
        });

        revalidatePath('/app/settings/integrations');
        return res;

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
