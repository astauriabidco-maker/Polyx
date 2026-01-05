import { NextResponse } from 'next/server';
import { LeadIngestionService } from '@/application/services/ingestion.service';
import { BulkLeadRequest } from '@/domain/dtos/api-types';

export async function POST(request: Request) {
    // 1. Auth Check
    const apiKey = request.headers.get('X-API-Key');
    const providerId = LeadIngestionService.validateApiKey(apiKey);

    if (!providerId) {
        return NextResponse.json({ success: false, error: 'Unauthorized : Invalid API Key' }, { status: 401 });
    }

    try {
        const body: BulkLeadRequest = await request.json();

        if (!body.leads || !Array.isArray(body.leads)) {
            return NextResponse.json({ success: false, error: "Invalid payload format. 'leads' array required." }, { status: 400 });
        }

        const result = await LeadIngestionService.ingestBulk(body.leads, providerId);

        // Always return 200 even for partial success, as per spec (errors array included)
        return NextResponse.json(result);

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
