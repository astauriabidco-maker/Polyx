'use server';

import { EdofService } from '@/application/services/edof.service';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';

export async function getEdofSettingsAction(orgId: string) {
    try {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });
        return { success: true, data: config };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function saveEdofConfigAction(orgId: string, data: {
    enabled: boolean;
    apiKey?: string;
    nda?: string;
    siret?: string;
}) {
    try {
        const updateData: any = {
            edofEnabled: data.enabled,
            edofNda: data.nda,
            edofSiret: data.siret
        };

        if (data.apiKey) {
            updateData.edofApiKey = encrypt(data.apiKey);
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

export async function testEdofConnectionAction(orgId: string) {
    try {
        const result = await EdofService.testConnection(orgId);

        await prisma.integrationConfig.update({
            where: { organisationId: orgId },
            data: {
                edofLastSyncAt: result.success ? new Date() : undefined,
                edofTestStatus: result.success ? 'success' : 'failed'
            }
        });

        revalidatePath('/app/settings/integrations');
        return result;
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function syncEdofDossiersAction(orgId: string) {
    try {
        console.log(`[EdofAction] 🔄 Starting EDOF sync for org: ${orgId}`);
        const results = await EdofService.syncDossiers(orgId);

        revalidatePath('/app/learners');

        return {
            success: true,
            message: `Synchronisation terminée : ${results.created} nouveaux dossiers, ${results.updated} mis à jour.`,
            data: results
        };
    } catch (error: any) {
        console.error('[EdofAction] Sync Error:', error);
        return { success: false, error: 'Échec de la synchronisation EDOF.' };
    }
}
