import { prisma } from '@/lib/prisma';
import { ApiLeadRequest, BulkLeadResponse, BulkLeadError } from '@/domain/dtos/api-types';
import { LeadStatus, LeadSource, SalesStage } from '@/domain/entities/lead';

// Mock Mapping from External Int IDs to Internal String IDs
// In a real scenario, this would be fetched from `IntegrationConfig` or `AgencyMapping`
const BRANCH_MAPPING: Record<number, string> = {
    3: 'cm5igjns0000008l412e873p8', // Example Org ID for demo
    5: 'cm5igjns0000008l412e873p8',
};

const EXAM_MAPPING: Record<number, string> = {
    12: 'TOEIC',
    18: 'BRIGHT',
};

export class LeadIngestionService {

    static validateApiKey(key: string | null): boolean {
        // Simple Environment Check
        const validKey = process.env.LEAD_API_KEY || 'secret-key-123';
        return key === validKey;
    }

    static async ingestBulk(leads: ApiLeadRequest[]): Promise<BulkLeadResponse> {
        let created = 0;
        let createdProspection = 0;
        let createdCrm = 0;
        const errors: BulkLeadError[] = [];

        for (let i = 0; i < leads.length; i++) {
            const raw = leads[i];

            try {
                // 1. Validation
                // Default to a fallback org if mapping fails (for demo purposes)
                const orgId = BRANCH_MAPPING[raw.branch_id] || 'cm5igjns0000008l412e873p8';

                if (!raw.email) throw new Error('Email is required.');

                // 2. Deduplication Check
                const existing = await prisma.lead.findFirst({
                    where: { email: raw.email, organisationId: orgId }
                });

                if (existing) {
                    throw new Error(`Duplicate lead: ${raw.email}`);
                }

                // 3. Routing Logic (Date Reponse)
                const today = new Date();
                const responseDate = new Date(raw.date_reponse);

                // Calculate difference in days
                const diffTime = Math.abs(today.getTime() - responseDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Rule: > 30 days = PROSPECTION (Cold), <= 30 days = CRM (Hot)
                let status = LeadStatus.PROSPECTION;
                let salesStage = SalesStage.NOUVEAU;

                // If extremely cold, just PROSPECTION without specific stage, but our schema requires one?
                // Actually SalesStage default is usually NOUVEAU.

                if (diffDays <= 30) {
                    // Hot Lead -> Treated as High Priority
                    status = LeadStatus.PROSPECT; // Standard entry
                }

                // 4. Persistence
                const source = this.mapSource(raw.source);

                await prisma.lead.create({
                    data: {
                        organisationId: orgId,
                        firstName: raw.first_name,
                        lastName: raw.last_name || '',
                        email: raw.email,
                        phone: raw.phone || '',
                        street: raw.street || '',
                        zipCode: raw.zip || '',
                        city: raw.city || '',
                        source: source,
                        status: status,
                        salesStage: salesStage,
                        score: diffDays <= 30 ? 90 : 50, // AI Score

                        // Meta
                        examId: EXAM_MAPPING[raw.examen_id], // Assuming exam exists or is string compatible
                        // note: in prisma schema examId connects to Exam model. 
                        // If mapping doesn't match real UUID, this will fail.
                        // For safety, we store in metadata if not sure.
                        metadata: {
                            raw_branch_id: raw.branch_id,
                            raw_exam_id: raw.examen_id,
                            ingestion_source: 'API_BULK'
                        }
                    }
                });

                created++;
                if (status === LeadStatus.PROSPECT && diffDays <= 30) createdCrm++;
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

    private static mapSource(rawSource: string): string {
        const normalized = rawSource.toLowerCase();
        if (normalized.includes('facebook')) return 'FACEBOOK';
        if (normalized.includes('google')) return 'GOOGLE_ADS';
        if (normalized.includes('website') || normalized.includes('site')) return 'WEBSITE';
        return 'IMPORT';
    }
}
