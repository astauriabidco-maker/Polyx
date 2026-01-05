import { db } from '@/infrastructure/mock-db';
import { ApiLeadRequest, BulkLeadResponse, BulkLeadError } from '@/domain/dtos/api-types';
import { Lead, LeadStatus, LeadSource } from '@/domain/entities/lead';

// Mock Mapping from External Int IDs to Internal String IDs
const BRANCH_MAPPING: Record<number, string> = {
    3: 'demo-org',
    5: 'sec-org-id',
};

const EXAM_MAPPING: Record<number, string> = {
    12: 'TOEIC',
    18: 'BRIGHT',
};

export class LeadIngestionService {

    static validateApiKey(key: string | null): string | null {
        if (!key) return null;
        // Check against mock DB
        const provider = db.apiProviders.find(p => p.apiKey === key && p.isActive);
        return provider ? provider.id : null;
    }

    static async ingestBulk(leads: ApiLeadRequest[], providerId: string): Promise<BulkLeadResponse> {
        let created = 0;
        let createdProspection = 0;
        let createdCrm = 0;
        const errors: BulkLeadError[] = [];

        for (let i = 0; i < leads.length; i++) {
            const index = i; // Save index for error report
            const raw = leads[i];

            try {
                // 1. Validation
                if (!raw.branch_id || !BRANCH_MAPPING[raw.branch_id]) {
                    throw new Error(`Branch ID ${raw.branch_id} unknown or unauthorized.`);
                }
                if (!raw.email) throw new Error('Email is required.');

                // 2. Routing Logic (Date Reponse)
                const today = new Date();
                const responseDate = new Date(raw.date_reponse);

                // Calculate difference in days
                const diffTime = Math.abs(today.getTime() - responseDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Rule: > 30 days = PROSPECTION (Cold), <= 30 days = CRM (Hot)
                let status = LeadStatus.PROSPECTION;
                if (diffDays <= 30) {
                    status = LeadStatus.QUALIFIED; // Mapping "CRM" to QUALIFIED in our model
                }

                // 3. Mapping
                const newLead: Lead = {
                    id: crypto.randomUUID(),
                    organizationId: BRANCH_MAPPING[raw.branch_id],
                    firstName: raw.first_name,
                    lastName: raw.last_name || '',
                    email: raw.email,
                    phone: raw.phone,
                    source: this.mapSource(raw.source),
                    status: status,
                    score: status === LeadStatus.QUALIFIED ? 90 : 50, // Initial AI Score based on freshness

                    // Metadata strictly for internal usage or display
                    campaignId: EXAM_MAPPING[raw.examen_id] || 'UNKNOWN_EXAM',
                    providerId: providerId, // Tag the source provider

                    callAttempts: 0,
                    history: [{
                        type: 'NOTE',
                        timestamp: new Date(),
                        userId: 'API_IMPORT',
                        details: { rawSource: raw.source, ingestion: 'BULK_API' }
                    }],
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                // 4. Persistence
                db.leads.push(newLead);

                created++;
                if (status === LeadStatus.QUALIFIED) createdCrm++;
                else createdProspection++;

            } catch (err: any) {
                errors.push({
                    index: i,
                    error: err.message || 'Unknown error'
                });
            }
        }

        return {
            success: true,
            total: leads.length,
            created,
            created_prospection: createdProspection,
            created_crm: createdCrm,
            errors
        };
    }

    private static mapSource(rawSource: string): LeadSource {
        const normalized = rawSource.toLowerCase();
        if (normalized.includes('facebook')) return LeadSource.FACEBOOK;
        if (normalized.includes('google')) return LeadSource.GOOGLE_ADS;
        if (normalized.includes('website') || normalized.includes('site')) return LeadSource.WEBSITE;
        return LeadSource.IMPORT;
    }
}
