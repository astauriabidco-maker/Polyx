import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AdsConnectorService } from '@/application/services/ads-connector.service';

/**
 * Meta Lead Ads Webhook
 * Handles verification and lead data ingestion.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token) {
        // In a real app, we'd find the org associated with this verify_token
        // For now, we'll allow a simple verification for demo purposes
        // Ideally: const config = await prisma.integrationConfig.findFirst({ where: { metaAdsVerifyToken: token } });
        if (token === process.env.META_ADS_VERIFY_TOKEN || token === 'polyx_verify') {
            return new Response(challenge, { status: 200 });
        }
    }

    return new Response('Verification failed', { status: 403 });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('[Meta Webhook] Received payload:', JSON.stringify(body));

        // Meta Webhook structure: { entry: [ { changes: [ { value: { leadgen_id, form_id, page_id } } ] } ] }
        for (const entry of body.entry || []) {
            for (const change of entry.changes || []) {
                if (change.field === 'leadgen') {
                    const { leadgen_id, form_id, page_id } = change.value;

                    // Find the organization matching this page_id or app context
                    // Simplified: using a default org for demo if none found
                    const config = await prisma.integrationConfig.findFirst({
                        where: { metaAdsEnabled: true },
                        select: { organisationId: true }
                    });

                    if (config) {
                        // Fetch actual lead details from Meta using leadgen_id (Mocked in service)
                        // In real: const metaData = await fetchMetaLead(leadgen_id, accessToken);
                        await AdsConnectorService.handleMetaLead(config.organisationId, {
                            lead_id: leadgen_id,
                            form_id: form_id,
                            // Mocking form fields usually fetched via API
                            first_name: 'Lead',
                            last_name: 'Meta',
                            email: `meta_${leadgen_id}@example.com`,
                            campaign_name: 'Meta Campaign Q1'
                        });
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Meta Webhook] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
