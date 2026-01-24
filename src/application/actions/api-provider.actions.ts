'use server';

import { prisma } from '@/lib/prisma';
import { checkIsGlobalAdminAction } from './auth.actions';
import { revalidatePath } from 'next/cache';

export interface ApiProviderData {
    id: string;
    organisationId: string;
    name: string;
    baseUrl?: string | null;
    apiKey?: string | null;
    webhookUrl?: string | null;
    isActive: boolean;
    status: string;
    legalName?: string | null;
    siret?: string | null;
    address?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    legalStatus?: string | null;
}

/**
 * Récupère la liste des prestataires (sans les clés API complètes)
 */
export async function getApiProvidersAction(organisationId: string) {
    try {
        const providers = await prisma.apiProvider.findMany({
            where: { organisationId },
            orderBy: { createdAt: 'desc' }
        });

        // Masquer les clés API pour l'affichage
        const safeProviders = providers.map((p: any) => ({
            ...p,
            apiKey: p.apiKey ? `${p.apiKey.substring(0, 4)}••••••••` : null
        }));

        return { success: true, data: safeProviders };
    } catch (error) {
        console.error("Failed to fetch API providers:", error);
        return { success: false, error: "Erreur lors du chargement des prestataires" };
    }
}

/**
 * Create a new API provider
 */
export async function createApiProviderAction(data: Omit<ApiProviderData, 'id'>) {
    try {
        // Here we could add role checks (Global Admin or Org Admin)
        // For now open to users with access to settings

        const provider = await prisma.apiProvider.create({
            data: {
                organisationId: data.organisationId,
                name: data.name,
                baseUrl: data.baseUrl || null,
                // apiKey: data.apiKey, // Security: Generated only after DPA signature
                webhookUrl: data.webhookUrl || null,
                isActive: false, // Security: Inactive until signed
                status: 'DRAFT', // Force draft for new providers
                legalName: data.legalName || null,
                siret: data.siret || null,
                address: data.address || null,
                contactName: data.contactName || null,
                contactEmail: data.contactEmail || null,
                legalStatus: data.legalStatus || null
            }
        });

        revalidatePath('/app/settings/integrations');
        return { success: true, data: provider };
    } catch (error: any) {
        console.error("Failed to create API provider:", error);
        return { success: false, error: error.message || "Erreur lors de la création" };
    }
}

/**
 * Update an existing API provider
 */
export async function updateApiProviderAction(id: string, data: Partial<ApiProviderData>) {
    try {
        const updateData: any = { ...data };
        delete updateData.id; // Protect ID
        delete updateData.organisationId; // Protect Org ownership

        // Don't overwrite apiKey if it's not provided or masked
        if (!updateData.apiKey || updateData.apiKey.includes('••••')) {
            delete updateData.apiKey;
        }

        // Sanitize update data (empty strings to null)
        if (updateData.baseUrl === '') updateData.baseUrl = null;
        if (updateData.webhookUrl === '') updateData.webhookUrl = null;
        if (updateData.legalName === '') updateData.legalName = null;
        if (updateData.siret === '') updateData.siret = null;
        if (updateData.address === '') updateData.address = null;
        if (updateData.contactName === '') updateData.contactName = null;
        if (updateData.contactEmail === '') updateData.contactEmail = null;
        if (updateData.legalStatus === '') updateData.legalStatus = null;

        const provider = await prisma.apiProvider.update({
            where: { id },
            data: updateData
        });

        revalidatePath('/app/settings/integrations');
        return { success: true, data: provider };
    } catch (error) {
        console.error("Failed to update API provider:", error);
        return { success: false, error: "Erreur lors de la mise à jour" };
    }
}

/**
 * Delete an API provider
 */
export async function deleteApiProviderAction(id: string) {
    try {
        await prisma.apiProvider.delete({
            where: { id }
        });

        revalidatePath('/app/settings/integrations');
        return { success: true };
    } catch (error) {
        console.error("Failed to delete API provider:", error);
        return { success: false, error: "Erreur lors de la suppression" };
    }
}
