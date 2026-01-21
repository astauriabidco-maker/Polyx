import { NextResponse } from 'next/server';
import { LeadIngestionService } from '@/application/services/ingestion.service';
import { BulkLeadRequest } from '@/domain/dtos/api-types';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';

export async function POST(request: Request) {
    // 1. Auth Check with IP Whitelisting
    const apiKey = request.headers.get('X-API-Key');
    const clientIP = request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || request.headers.get('X-Real-IP') || 'unknown';

    const { providerId, ipAllowed } = LeadIngestionService.validateApiKeyWithIP(apiKey, clientIP);

    if (!providerId) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Invalid API Key' }, { status: 401 });
    }

    if (!ipAllowed) {
        return NextResponse.json({ success: false, error: `Forbidden: IP ${clientIP} is not whitelisted for this API key.` }, { status: 403 });
    }

    // 2. Rate Limiting (per API Key)
    const rateCheck = checkRateLimit(apiKey!);
    const rateLimitHeaders = getRateLimitHeaders(rateCheck.remaining, rateCheck.resetIn);

    if (!rateCheck.allowed) {
        return NextResponse.json(
            { success: false, error: 'Rate limit exceeded. Please wait before retrying.' },
            { status: 429, headers: rateLimitHeaders }
        );
    }

    try {
        const body: BulkLeadRequest = await request.json();

        if (!body.leads || !Array.isArray(body.leads)) {
            return NextResponse.json({ success: false, error: "Invalid payload format. 'leads' array required." }, { status: 400 });
        }

        const result = await LeadIngestionService.ingestBulk(body.leads);

        // Always return 200 even for partial success, as per spec (errors array included)
        return NextResponse.json(result, { headers: rateLimitHeaders });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
