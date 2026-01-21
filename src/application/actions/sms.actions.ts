'use server';

import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';
import { SmsService } from '@/application/services/sms.service';

/**
 * Get current SMS settings (masked keys)
 */
export async function getSmsSettingsAction(orgId: string) {
    try {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config) return { success: true, data: null };

        return {
            success: true,
            data: {
                smsEnabled: config.smsEnabled,
                // Reuse existing Twilio fields
                twilioAccountSid: config.twilioAccountSid ? '••••••••' + config.twilioAccountSid.slice(-4) : '',
                twilioAuthToken: config.twilioAuthToken ? '••••••••' : '',
                twilioSmsFrom: config.twilioSmsFrom,

                smsLastTestedAt: config.smsLastTestedAt,
                smsTestStatus: config.smsTestStatus
            }
        };
    } catch (error) {
        return { success: false, error: "Failed to fetch SMS settings" };
    }
}

/**
 * Save SMS Configuration
 * Note: This updates the shared Twilio credentials!
 */
export async function saveSmsConfigAction(
    orgId: string,
    data: {
        enabled: boolean;
        accountSid?: string;
        authToken?: string;
        fromNumber: string;
    }
) {
    try {
        const existing = await prisma.integrationConfig.findUnique({ where: { organisationId: orgId } });

        let finalSid = existing?.twilioAccountSid;
        let finalToken = existing?.twilioAuthToken;

        // Encrypt if changed (and not mask)
        if (data.accountSid && !data.accountSid.startsWith('••••')) {
            finalSid = encrypt(data.accountSid);
        }
        if (data.authToken && !data.authToken.startsWith('••••')) {
            finalToken = encrypt(data.authToken);
        }

        await prisma.integrationConfig.upsert({
            where: { organisationId: orgId },
            update: {
                smsEnabled: data.enabled,
                twilioAccountSid: finalSid,
                twilioAuthToken: finalToken,
                twilioSmsFrom: data.fromNumber
            },
            create: {
                organisationId: orgId,
                smsEnabled: data.enabled,
                twilioAccountSid: finalSid,
                twilioAuthToken: finalToken,
                twilioSmsFrom: data.fromNumber
            }
        });

        revalidatePath('/app/settings/integrations');
        return { success: true };
    } catch (error) {
        console.error("Save SMS Config Error:", error);
        return { success: false, error: "Failed to save configuration" };
    }
}

/**
 * Test SMS Connection
 */
export async function testSmsConnectionAction(orgId: string, testPhone: string) {
    try {
        const res = await SmsService.testConnection(orgId, testPhone);

        await prisma.integrationConfig.update({
            where: { organisationId: orgId },
            data: {
                smsLastTestedAt: new Date(),
                smsTestStatus: res.success ? 'success' : 'failed'
            }
        });

        revalidatePath('/app/settings/integrations');
        return res;
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
