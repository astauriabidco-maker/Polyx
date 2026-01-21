'use server';

import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import { StripeService } from '@/application/services/stripe.service';
import { revalidatePath } from 'next/cache';

// ============================================
// SAVE CONFIGURATION
// ============================================

export async function saveStripeConfigAction(
    orgId: string,
    secretKey: string,
    publishableKey: string,
    webhookSecret: string
) {
    try {
        await (prisma as any).integrationConfig.upsert({
            where: { organisationId: orgId },
            create: {
                organisationId: orgId,
                stripeSecretKey: encrypt(secretKey),
                stripePublishableKey: publishableKey,
                stripeWebhookSecret: encrypt(webhookSecret),
                stripeEnabled: true
            },
            update: {
                stripeSecretKey: encrypt(secretKey),
                stripePublishableKey: publishableKey,
                stripeWebhookSecret: encrypt(webhookSecret),
                stripeEnabled: true
            }
        });

        revalidatePath('/app/settings/integrations');
        return { success: true, message: 'Configuration Stripe enregistrée.' };
    } catch (error) {
        console.error('[StripeAction] Save error:', error);
        return { success: false, error: 'Erreur lors de la sauvegarde.' };
    }
}

// ============================================
// TEST CONNECTION
// ============================================

export async function testStripeConnectionAction(orgId: string) {
    try {
        const service = await StripeService.create(orgId);
        if (!service) {
            return { success: false, error: 'Configuration Stripe introuvable ou incomplète.' };
        }

        const result = await service.testConnection();

        // Update audit status
        await (prisma as any).integrationConfig.update({
            where: { organisationId: orgId },
            data: {
                stripeLastTestedAt: new Date(),
                stripeTestStatus: result.success ? 'success' : 'failed'
            }
        });

        revalidatePath('/app/settings/integrations');
        return result;

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ============================================
// GET SETTINGS
// ============================================

export async function getStripeSettingsAction(orgId: string) {
    try {
        const config = await (prisma as any).integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config) return { success: false };

        return {
            success: true,
            data: {
                enabled: config.stripeEnabled,
                publishableKey: config.stripePublishableKey,
                lastTestedAt: config.stripeLastTestedAt,
                testStatus: config.stripeTestStatus,
                secretKeyMasked: config.stripeSecretKey ? '••••••••' : null,
                webhookSecretMasked: config.stripeWebhookSecret ? '••••••••' : null
            }
        };
    } catch (error) {
        return { success: false, error: 'Erreur récupération données.' };
    }
}

// ============================================
// GENERATE INVOICE PAYMENT LINK
// ============================================

export async function generateInvoicePaymentLinkAction(invoiceId: string) {
    try {
        // 1. Fetch Invoice
        const invoice = await (prisma as any).invoice.findUnique({
            where: { id: invoiceId },
            include: { organisation: true }
        });

        if (!invoice) return { success: false, error: 'Facture introuvable' };
        if (invoice.balanceDue <= 0) return { success: false, error: 'Cette facture est déjà soldée.' };

        const orgId = invoice.organisation.id;

        // 2. Init Stripe
        const service = await StripeService.create(orgId);
        if (!service) return { success: false, error: 'Paiement en ligne non configuré.' };

        // 3. Create Link
        // Redirect back to invoice page after payment
        // We need the absolute URL of the app. In Next.js server actions, getting host is tricky
        // Use an ENV variable or default
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const redirectUrl = `${baseUrl}/app/billing/invoices/${invoiceId}?payment_success=true`;

        const result = await service.createPaymentLink(
            invoice.balanceDue, // Passing full float amount, service handles conversion
            'EUR',
            `Facture ${invoice.number}`,
            redirectUrl,
            {
                invoiceId: invoice.id,
                orgId: orgId
            }
        );

        if (!result.success || !result.url) {
            return { success: false, error: result.error || 'Erreur création lien' };
        }

        // 4. Update Invoice
        await (prisma as any).invoice.update({
            where: { id: invoiceId },
            data: {
                stripePaymentLinkId: result.id,
                stripePaymentUrl: result.url
            }
        });

        revalidatePath(`/app/billing/invoices/${invoiceId}`);
        return { success: true, url: result.url };

    } catch (error: any) {
        console.error("Stripe Action Error", error);
        return { success: false, error: error.message };
    }
}
