import { NextRequest, NextResponse } from 'next/server';
import { LeadIngestionService } from '@/application/services/ingestion.service';
import { ApiLeadRequest } from '@/domain/dtos/api-types';

export async function POST(req: NextRequest) {
    // 1. Security Check
    const apiKey = req.headers.get('x-api-key');
    if (!LeadIngestionService.validateApiKey(apiKey)) {
        return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 });
    }

    try {
        // 2. Payload Validation
        const body = await req.json();

        // Ensure request is an array (batch) or single object converted to array
        const leads: ApiLeadRequest[] = Array.isArray(body) ? body : [body];

        if (leads.length === 0) {
            return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
        }

        // 3. Processing
        const result = await LeadIngestionService.ingestBulk(leads);

        // 4. Response
        return NextResponse.json(result, { status: 201 });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
