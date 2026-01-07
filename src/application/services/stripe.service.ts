import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

export class StripeService {
    private stripe: Stripe | null = null;

    private constructor(apiKey: string) {
        this.stripe = new Stripe(apiKey, {
            apiVersion: '2023-10-16' as any, // Pin version for stability
            typescript: true,
        });
    }

    static async create(organisationId: string): Promise<StripeService | null> {
        const config = await (prisma as any).integrationConfig.findUnique({
            where: { organisationId }
        });

        if (!config || !config.stripeEnabled || !config.stripeSecretKey) {
            return null;
        }

        const apiKey = decrypt(config.stripeSecretKey);
        if (!apiKey) return null;

        return new StripeService(apiKey);
    }

    async testConnection(): Promise<{ success: boolean; message?: string; account?: any }> {
        if (!this.stripe) return { success: false, message: 'Stripe not initialized' };
        try {
            // Retrieve balance as a simple test
            const balance = await this.stripe.balance.retrieve();
            return { success: true, message: 'Connexion réussie', account: balance };
        } catch (error: any) {
            console.error('Stripe Connection Error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Creates a Payment Link for an Invoice
     */
    async createPaymentLink(
        amount: number, // in cents (e.g. 150000 for 1500.00 EUR)
        currency: string,
        description: string,
        redirectUrl: string,
        metadata: Record<string, string> = {}
    ): Promise<{ success: boolean; url?: string; id?: string; error?: string }> {
        if (!this.stripe) return { success: false, error: 'Stripe not initialized' };

        try {
            // 1. Create a Product/Price on the fly (or reuse if structured)
            // For simplicity in this integration, we create a one-time price.

            // To create a payment link, we first need a Price ID. 
            // We can treat this as a "One-off" line item.

            // Step A: Create Price (and implicit Product)
            const price = await this.stripe.prices.create({
                currency: currency,
                unit_amount: Math.round(amount * 100), // Convert to cents
                product_data: {
                    name: description,
                },
            });

            // Step B: Create Payment Link
            const paymentLink = await this.stripe.paymentLinks.create({
                line_items: [
                    {
                        price: price.id,
                        quantity: 1,
                    },
                ],
                after_completion: {
                    type: 'redirect',
                    redirect: {
                        url: redirectUrl,
                    },
                },
                metadata: metadata,
            });

            return {
                success: true,
                url: paymentLink.url,
                id: paymentLink.id
            };

        } catch (error: any) {
            console.error('Stripe PaymentLink Error:', error);
            return { success: false, error: error.message };
        }
    }
}
