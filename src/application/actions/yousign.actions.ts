'use server';

import { prisma } from '@/lib/prisma';
import { encrypt, maskSensitive } from '@/lib/crypto';
import { YousignService } from '@/application/services/yousign.service';
import { revalidatePath } from 'next/cache';

// ============================================
// SAVE CONFIGURATION
// ============================================

export async function saveYousignConfigAction(
    orgId: string,
    apiKey: string,
    environment: 'sandbox' | 'production'
) {
    try {
        await (prisma as any).integrationConfig.upsert({
            where: { organisationId: orgId },
            create: {
                organisationId: orgId,
                yousignApiKey: encrypt(apiKey),
                yousignEnvironment: environment,
                yousignEnabled: true
            },
            update: {
                yousignApiKey: encrypt(apiKey),
                yousignEnvironment: environment,
                yousignEnabled: true
            }
        });

        revalidatePath('/app/settings/integrations');
        return { success: true, message: 'Configuration Yousign enregistrée.' };
    } catch (error) {
        console.error('[YousignAction] Save error:', error);
        return { success: false, error: 'Erreur lors de la sauvegarde.' };
    }
}

// ============================================
// TEST CONNECTION
// ============================================

export async function testYousignConnectionAction(orgId: string) {
    try {
        const service = await YousignService.create(orgId);
        if (!service) {
            return { success: false, error: 'Configuration Yousign introuvable.' };
        }

        const result = await service.testConnection();

        // Update audit status
        await (prisma as any).integrationConfig.update({
            where: { organisationId: orgId },
            data: {
                yousignLastTestedAt: new Date(),
                yousignTestStatus: result.success ? 'success' : 'failed'
            }
        });

        revalidatePath('/app/settings/integrations');
        return result;

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ============================================
// GET STATUS
// ============================================

export async function getYousignSettingsAction(orgId: string) {
    try {
        const config = await (prisma as any).integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config) return { success: false };

        return {
            success: true,
            data: {
                enabled: config.yousignEnabled,
                environment: config.yousignEnvironment,
                lastTestedAt: config.yousignLastTestedAt,
                testStatus: config.yousignTestStatus,
                apiKeyMasked: config.yousignApiKey ? '••••••••' : null
            }
        };
    } catch (error) {
        return { success: false, error: 'Erreur récupération données.' };
    }
}

// ============================================
// CREATE SIGNATURE REQUEST (Demo)
// ============================================

export async function createDemoSignatureRequestAction(orgId: string, signerEmail: string) {
    // This is a placeholder for the actual business logic action
    // In a real scenario, this would generate a PDF buffer from a contract

    try {
        const service = await YousignService.create(orgId);
        if (!service) return { success: false, error: 'Service non configuré' };

        // Mock PDF Buffer (would come from PDF generation service)
        const pdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n...';
        const buffer = Buffer.from(pdfContent);

        const result = await service.initiateSignatureRequest(
            'Contrat de Formation (Démo)',
            buffer,
            [{
                firstName: 'John',
                lastName: 'Doe',
                email: signerEmail,
                phoneNumber: '+33612345678'
            }]
        );

        return result;

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ============================================
// DOCUMENT SIGNATURE (Real)
// ============================================

export async function initiateDocumentSignatureAction(
    documentId: string,
    email: string,
    firstName: string,
    lastName: string,
    phoneNumber: string
) {
    try {
        // 1. Fetch Document
        const doc = await (prisma as any).learnerDocument.findUnique({
            where: { id: documentId },
            include: { folder: { include: { organisation: true } } }
        });

        if (!doc) return { success: false, error: 'Document introuvable' };
        if (!doc.fileUrl) return { success: false, error: 'Le document n\'a pas de fichier PDF associé.' };

        const orgId = doc.folder.organisation.id;

        // 2. Fetch File Content (needs to be implemented if fileUrl is external)
        // For this implementation, we assume fileUrl is accessible or we mock download.
        // If fileUrl is on AWS S3 or similar, we need to fetch it.
        // For simplicity/demo, I will assume a mock fetch or that YousignService handles URL.
        // BUT YousignService currently takes a Buffer. 
        // I will do a fetch here.

        let pdfBuffer: Buffer;
        try {
            // Basic fetch for public/presigned URLs
            const res = await fetch(doc.fileUrl);
            if (!res.ok) throw new Error("Failed to fetch PDF");
            const arrayBuffer = await res.arrayBuffer();
            pdfBuffer = Buffer.from(arrayBuffer);
        } catch (e) {
            console.error("PDF Fetch Error", e);
            return { success: false, error: 'Impossible de télécharger le fichier PDF source.' };
        }

        // 3. Initiate Yousign
        const service = await YousignService.create(orgId);
        if (!service) return { success: false, error: 'Signature électronique non configurée.' };

        const result = await service.initiateSignatureRequest(
            doc.label || 'Document à signer',
            pdfBuffer,
            [{
                firstName,
                lastName,
                email,
                phoneNumber
            }]
        );

        if (!result.success) return { success: false, error: result.error };

        // 4. Update Document Status
        await (prisma as any).learnerDocument.update({
            where: { id: documentId },
            data: {
                yousignProcedureId: result.procedureId,
                yousignStatus: 'started',
                status: 'PENDING_REVIEW' // or a dedicated state 'SIGNING'
            }
        });

        revalidatePath(`/app/learners/${doc.folder.learnerId}`);
        return { success: true, message: 'Demande de signature envoyée !' };

    } catch (error: any) {
        console.error("Sign Action Error", error);
        return { success: false, error: error.message || 'Erreur inconnue' };
    }
}
