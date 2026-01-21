'use server';

import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';

/**
 * Generates a new random webhook secret for the organization
 */
export async function generateWebhookSecretAction(organisationId: string) {
    try {
        const secret = randomBytes(32).toString('hex');

        await prisma.integrationConfig.upsert({
            where: { organisationId },
            update: { webhookSecret: secret },
            create: {
                organisationId,
                webhookSecret: secret
            }
        });

        revalidatePath('/app/settings/marketing');
        return { success: true, secret };
    } catch (error: any) {
        console.error('Generate Webhook Secret Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Retrieves the current webhook settings (secret)
 */
export async function getWebhookSettingsAction(organisationId: string) {
    try {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId },
            select: { webhookSecret: true }
        });

        return {
            success: true,
            secret: config?.webhookSecret || null
        };
    } catch (error: any) {
        console.error('Get Webhook Settings Error:', error);
        return { success: false, error: error.message };
    }
}
