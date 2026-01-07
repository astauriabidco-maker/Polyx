'use server';

import { KairosService } from '@/application/services/kairos.service';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';

export async function getKairosSettingsAction(orgId: string) {
    try {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });
        return { success: true, data: config };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function saveKairosConfigAction(orgId: string, data: {
    enabled: boolean;
    apiKey?: string;
    organismId?: string;
}) {
    try {
        const updateData: any = {
            kairosEnabled: data.enabled,
            kairosOrganismId: data.organismId
        };

        if (data.apiKey) {
            updateData.kairosApiKey = encrypt(data.apiKey);
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

export async function testKairosConnectionAction(orgId: string) {
    try {
        const service = await KairosService.create(orgId);
        if (!service) return { success: false, error: "Configuration Kairos inactive." };

        const result = await service.testConnection();

        await prisma.integrationConfig.update({
            where: { organisationId: orgId },
            data: {
                kairosLastSyncAt: result.success ? new Date() : undefined,
                kairosTestStatus: result.success ? 'success' : 'failed'
            }
        });

        revalidatePath('/app/settings/integrations');
        return result;
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function declareKairosEntryAction(orgId: string, trainee: any, training: any) {
    try {
        const service = await KairosService.create(orgId);
        if (!service) return { success: false, error: "Kairos non configuré." };

        return await service.declareEntry(trainee, training);
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
