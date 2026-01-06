import { NextResponse } from 'next/server';
import { LeadStatus, SalesStage } from '@/domain/entities/lead';
import { prisma } from '@/lib/prisma';
import { LeadValidationService } from '@/application/services/lead-validation.service';
import { ScoringEngine } from '@/application/services/scoring-engine.service';

interface BulkLeadPayload {
    leads: Array<any>;
}

export async function POST(request: Request) {
    try {
        // 1. Authenticate Provider
        const apiKey = request.headers.get('X-API-Key');
        if (!apiKey) {
            return NextResponse.json({ error: 'Missing API Key' }, { status: 401 });
        }

        // Mock lookup for demonstration, in production this would be a Prisma call to ApiProvider table
        const provider = { id: 'prov-1', apiKey: 'polyx-secret-key-123', complianceStatus: 'VERIFIED' };

        if (apiKey !== provider.apiKey) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 403 });
        }

        // RGPD Application Lock
        if (provider.complianceStatus !== 'VERIFIED') {
            return NextResponse.json({
                error: 'GDPR Compliance Lock: Data Processing Agreement (DPA) not signed or verified.',
                compliance_status: 'PENDING'
            }, { status: 403 });
        }

        const body: BulkLeadPayload = await request.json();

        if (!body.leads || !Array.isArray(body.leads)) {
            return NextResponse.json({ error: 'Invalid format. Expected { "leads": [...] }' }, { status: 400 });
        }

        const report = {
            success: true,
            created: 0,
            created_prospection: 0,
            created_crm: 0,
            total: body.leads.length,
            errors: [] as any[]
        };

        const now = new Date();

        for (const [index, raw] of body.leads.entries()) {
            try {
                // 2. Validation & Sanitization
                const sanitized = LeadValidationService.validateAndSanitize(raw);
                // Fetch a real logic or org context if needed, for now use default
                const orgId = await LeadValidationService.mapOrganization(sanitized.branch_id);

                // 3. Routing Logic
                const responseDate = new Date(sanitized.date_reponse);
                const diffTime = Math.abs(now.getTime() - responseDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const isRecent = diffDays <= 30;

                const targetStatus = LeadStatus.PROSPECT;
                const targetSalesStage = isRecent ? SalesStage.NOUVEAU : undefined;

                // 4. Persistence (Real Prisma Call)
                const lead = await prisma.lead.create({
                    data: {
                        organisationId: orgId,
                        providerId: provider.id, // Link to the API Provider
                        firstName: sanitized.first_name,
                        lastName: sanitized.last_name,
                        email: sanitized.email,
                        phone: sanitized.phone,
                        source: sanitized.source,
                        status: targetStatus,
                        salesStage: targetSalesStage,
                        responseDate: responseDate,
                        consentDate: sanitized.date_consentement ? new Date(sanitized.date_consentement) : null,
                        score: isRecent ? 70 : 30, // Default temporary score
                        callAttempts: 0,
                        metadata: {
                            examId: sanitized.examen_id?.toString(),
                            branchId: sanitized.branch_id?.toString(),
                        }
                    }
                });

                // 5. Dynamic Scoring Integration (Predictive)
                const predictiveScore = await ScoringEngine.calculatePredictiveScore(lead.id);
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { score: predictiveScore }
                });

                if (isRecent) report.created_crm++;
                else report.created_prospection++;

                report.created++;

            } catch (err: any) {
                report.errors.push({ index, error: err.message || 'Validation error' });
            }
        }

        console.log(`[ADVANCED_INGESTION] Processed ${report.total} leads. Created: ${report.created}. Errors: ${report.errors.length}`);
        return NextResponse.json(report);

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Invalid payload or server error' }, { status: 400 });
    }
}
