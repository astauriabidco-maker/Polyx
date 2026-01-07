'use server';

import { ChorusService } from '@/application/services/chorus.service';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';

export async function getChorusSettingsAction(orgId: string) {
    try {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });
        return { success: true, data: config };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function saveChorusConfigAction(orgId: string, data: {
    enabled: boolean;
    clientId?: string;
    clientSecret?: string;
    accountLogin?: string;
    accountPassword?: string;
    environment?: 'sandbox' | 'production';
}) {
    try {
        const updateData: any = {
            chorusEnabled: data.enabled,
            chorusClientId: data.clientId,
            chorusAccountLogin: data.accountLogin,
            chorusEnvironment: data.environment
        };

        if (data.clientSecret) {
            updateData.chorusClientSecret = encrypt(data.clientSecret);
        }
        if (data.accountPassword) {
            updateData.chorusAccountPassword = encrypt(data.accountPassword);
        }

        await prisma.integrationConfig.upsert({
            where: { organisationId: orgId },
            create: { organisationId: orgId, ...updateData },
            update: updateData
        });

        revalidatePath('/app/settings/integrations');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function testChorusConnectionAction(orgId: string) {
    try {
        const service = await ChorusService.create(orgId);
        if (!service) return { success: false, error: "Configuration Chorus Pro inactive." };

        const result = await service.testConnection();

        await prisma.integrationConfig.update({
            where: { organisationId: orgId },
            data: {
                chorusLastTestedAt: new Date(),
                chorusTestStatus: result.success ? 'success' : 'failed'
            }
        });

        revalidatePath('/app/settings/integrations');
        return result;
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function submitChorusInvoiceAction(orgId: string, invoiceData: any) {
    try {
        const service = await ChorusService.create(orgId);
        if (!service) return { success: false, error: "Chorus Pro non configuré." };

        const result = await service.submitInvoice(invoiceData);
        return result;
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
