import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { WalletService } from '@/application/services/wallet.service';
import { decrypt } from '@/lib/crypto';

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
    }

    try {
        // 1. Get Secret from Headers or Metadata? 
        // Stripe webhooks are usually configured with a single secret per endpoint.
        // However, in a multi-tenant app with multiple Stripe accounts, we might need a way to find the right secret.
        // For now, we assume we use a global secret or we can derive the organization from the payload metadata to find the config.

        // Let's first parse the event without verification just to find the metadata if needed, 
        // BUT it's better to verify. Let's find the orgId from metadata first if possible.
        const unverifiedEvent = JSON.parse(body);
        const orgId = unverifiedEvent.data?.object?.metadata?.orgId;

        if (!orgId) {
            return NextResponse.json({ error: 'Missing orgId in metadata' }, { status: 400 });
        }

        // 2. Fetch Config for this Org
        const config = await (prisma as any).integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config || !config.stripeWebhookSecret) {
            return NextResponse.json({ error: 'Stripe not configured for this organization' }, { status: 400 });
        }

        const webhookSecret = decrypt(config.stripeWebhookSecret);
        const stripeSecretKey = decrypt(config.stripeSecretKey);

        const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' as any });

        // 3. Verify Webhook Signature
        const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

        // 4. Handle Event
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                const amountTotal = (session.amount_total || 0) / 100; // Cents to Euros
                const invoiceId = session.metadata?.invoiceId;

                console.log(`[Stripe Webhook] Payment completed for Org: ${orgId}, Amount: ${amountTotal}`);

                // A. Credit Wallet
                await WalletService.credit(
                    orgId,
                    amountTotal,
                    `Rechargement via Stripe (Session: ${session.id})`,
                    { stripeSessionId: session.id }
                );

                // B. If linked to an invoice, mark it as paid
                if (invoiceId) {
                    await (prisma as any).invoice.update({
                        where: { id: invoiceId },
                        data: {
                            status: 'PAID',
                            paidAmount: { increment: amountTotal },
                            balanceDue: { decrement: amountTotal },
                            paidAt: new Date()
                        }
                    });
                    console.log(`[Stripe Webhook] Invoice ${invoiceId} marked as PAID`);
                }
                break;

            default:
                console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });

    } catch (err: any) {
        console.error(`[Stripe Webhook] Error: ${err.message}`);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
