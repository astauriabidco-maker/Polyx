import { NextResponse } from 'next/server';
import { LeadIngestionService } from '@/application/services/ingestion.service';

export async function GET(request: Request) {
    // 1. Auth Check
    const apiKey = request.headers.get('X-API-Key');
    if (!LeadIngestionService.validateApiKey(apiKey)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Mock Response based on internal Mapping
    // In real app, query DB.Organization
    return NextResponse.json({
        success: true,
        branches: [
            { id: 3, name: "POLYX PARIS (DEMO)" },
            { id: 5, name: "POLYX LYON (SEC)" }
        ]
    });
}
