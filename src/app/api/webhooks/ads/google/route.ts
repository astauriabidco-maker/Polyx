import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AdsConnectorService } from '@/application/services/ads-connector.service';

/**
 * Google Ads Lead Form Webhook
 * Verifies google_key and ingests lead data.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('[Google Webhook] Received payload:', JSON.stringify(body));

        const { google_key, lead_id, campaign_id, user_column_data } = body;

        if (!google_key) {
            return NextResponse.json({ error: 'Missing google_key' }, { status: 400 });
        }

        // Find organization with this webhook secret
        const config = await prisma.integrationConfig.findFirst({
            where: { googleAdsWebhookSecret: google_key, googleAdsEnabled: true },
            select: { organisationId: true }
        });

        if (!config) {
            return NextResponse.json({ error: 'Invalid google_key' }, { status: 403 });
        }

        await AdsConnectorService.handleGoogleLead(config.organisationId, body);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Google Webhook] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack
        }, { status: 500 });
    }
}
