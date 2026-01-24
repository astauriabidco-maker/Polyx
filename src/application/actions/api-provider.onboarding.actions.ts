'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { YousignService } from '../services/yousign.service';
import { randomUUID, randomBytes } from 'crypto';

/**
 * Save legal details and set status to DRAFT
 */
export async function saveProviderLegalDetailsAction(id: string, data: any) {
    try {
        await prisma.apiProvider.update({
            where: { id },
            data: {
                siret: data.siret,
                legalName: data.legalName,
                address: data.address,
                contactName: data.contactName,
                contactEmail: data.contactEmail,
                legalStatus: data.legalStatus,
                status: 'DRAFT'
            }
        });
        revalidatePath('/app/settings/integrations');
        return { success: true };
    } catch (error) {
        console.error("Failed to save legal details:", error);
        return { success: false, error: "Erreur lors de la sauvegarde" };
    }
}

/**
 * Initiate Onboarding: Generate PDF -> Send to Yousign -> Update Status
 */
export async function initiateOnboardingAction(providerId: string, orgId: string) {
    try {
        const provider = await prisma.apiProvider.findUnique({ where: { id: providerId } });
        if (!provider) return { success: false, error: "Prestataire introuvable" };

        if (!provider.contactEmail || !provider.contactName) {
            return { success: false, error: "Nom et Email de contact obligatoires" };
        }

        // 1. Initialize Yousign Service
        const yousign = await YousignService.create(orgId);
        if (!yousign) {
            return { success: false, error: "Yousign n'est pas configuré pour cette organisation" };
        }

        // 2. Generate PDF (Mock for now - ideally use a PDF generator service)
        // In real impl: render HTML template with provider details to buffer.
        const pdfContent = `
            CONTRAT DE TRAITEMENT DES DONNÉES (DPA)
            
            Entre:
            L'Organisation (Nous)
            Et:
            ${provider.legalName} (SIRET: ${provider.siret})
            
            Le prestataire s'engage à respecter le RGPD...
            
            Signé le: ${new Date().toLocaleDateString()}
        `;
        const pdfBuffer = Buffer.from(pdfContent);

        // 3. Send to Yousign
        const [firstName, ...lastNameParts] = provider.contactName.split(' ');
        const lastName = lastNameParts.join(' ') || 'Contact';

        const result = await yousign.initiateSignatureRequest(
            `DPA - ${provider.name}`,
            pdfBuffer,
            [{
                firstName: firstName,
                lastName: lastName,
                email: provider.contactEmail,
                phoneNumber: '+33600000000' // Mock phone if missing, real flow needs it
            }]
        );

        if (!result.success || !result.procedureId) {
            return { success: false, error: result.error || "Erreur Yousign" };
        }

        // 4. Update Provider Status
        await prisma.apiProvider.update({
            where: { id: providerId },
            data: {
                status: 'PENDING_SIGNATURE',
                yousignProcedureId: result.procedureId
            }
        });

        revalidatePath('/app/settings/integrations');
        return { success: true };

    } catch (error: any) {
        console.error("Onboarding initiation failed:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Finalize Onboarding: Check Yousign -> Generate Key -> Active
 */
export async function finalizeOnboardingAction(providerId: string, orgId: string) {
    try {
        const provider = await prisma.apiProvider.findUnique({ where: { id: providerId } });
        if (!provider || !provider.yousignProcedureId) {
            return { success: false, error: "Procédure introuvable" };
        }

        // 1. Check Status with Yousign
        const yousign = await YousignService.create(orgId);
        if (!yousign) return { success: false, error: "Service Yousign indisponible" };

        const status = await yousign.getSignatureStatus(provider.yousignProcedureId);

        if (status !== 'finished') {
            return { success: false, error: `Le contrat n'est pas encore signé (Statut: ${status})` };
        }

        // 2. Generate Secure API Key if not exists
        let apiKey = provider.apiKey;
        if (!apiKey || apiKey.includes('temp')) {
            // Generate a secure random key
            apiKey = `pk_${randomBytes(24).toString('hex')}`;
        }

        // 3. Activate Provider
        await prisma.apiProvider.update({
            where: { id: providerId },
            data: {
                status: 'ACTIVE',
                isActive: true,
                apiKey: apiKey,
                signedAt: new Date()
            }
        });

        revalidatePath('/app/settings/integrations');
        return { success: true, apiKey: apiKey }; // Return key ONCE for display

    } catch (error: any) {
        console.error("Onboarding finalization failed:", error);
        return { success: false, error: error.message };
    }
}
