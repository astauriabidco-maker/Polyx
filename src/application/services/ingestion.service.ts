import { prisma } from '@/lib/prisma';
import { ApiLeadRequest, BulkLeadResponse, BulkLeadError } from '@/domain/dtos/api-types';
import { LeadStatus, LeadSource, SalesStage } from '@/domain/entities/lead';
import { normalizePhone, normalizeEmail, capitalize } from '@/lib/data-utils';

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

    static validateApiKey(key: string | null): string | null {
        if (!key) return null;

        // In a real app, this would be a DB query.
        // Here we use our singleton MockDB instance.
        const { db } = require('@/infrastructure/mock-db');
        const provider = db.apiProviders.find((p: any) => p.apiKey === key && p.isActive);

        return provider ? provider.id : null;
    }

    static validateApiKeyWithIP(key: string | null, clientIP: string | null): { providerId: string | null; ipAllowed: boolean } {
        if (!key) return { providerId: null, ipAllowed: false };

        const { db } = require('@/infrastructure/mock-db');
        const provider = db.apiProviders.find((p: any) => p.apiKey === key && p.isActive);

        if (!provider) return { providerId: null, ipAllowed: false };

        // If no IP whitelist configured, allow all
        if (!provider.allowedIPs || provider.allowedIPs.length === 0) {
            return { providerId: provider.id, ipAllowed: true };
        }

        // Check if client IP is in whitelist
        const ipAllowed = provider.allowedIPs.includes(clientIP || '');
        return { providerId: provider.id, ipAllowed };
    }

    static async ingestBulk(leads: ApiLeadRequest[]): Promise<BulkLeadResponse> {
        let created = 0;
        let createdProspection = 0;
        let createdCrm = 0;
        let quarantined = 0;
        const errors: BulkLeadError[] = [];

        for (let i = 0; i < leads.length; i++) {
            const raw = leads[i];

            try {
                // 1. Normalize Data
                const normalizedEmail = normalizeEmail(raw.email);
                const normalizedPhone = normalizePhone(raw.phone || '');
                const firstName = capitalize(raw.first_name);
                const lastName = capitalize(raw.last_name || '');

                // 2. Validation
                const orgId = BRANCH_MAPPING[raw.branch_id] || 'cm5igjns0000008l412e873p8';

                if (!normalizedEmail && !normalizedPhone) {
                    throw new Error('Email or Phone is required.');
                }

                // 3. Deduplication Check
                const existing = await prisma.lead.findFirst({
                    where: {
                        organisationId: orgId,
                        OR: [
                            { email: normalizedEmail },
                            { phone: normalizedPhone }
                        ]
                    }
                });

                let isQuarantined = false;
                let quarantineReason = '';

                if (existing) {
                    isQuarantined = true;
                    quarantineReason = `Duplicate of lead ID: ${existing.id}`;
                }

                // 4. Routing Logic (Date Reponse)
                const today = new Date();
                const responseDate = new Date(raw.date_reponse);
                const diffTime = Math.abs(today.getTime() - responseDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let status = isQuarantined ? 'QUARANTINE' : (diffDays <= 30 ? LeadStatus.PROSPECT : LeadStatus.PROSPECTION);
                let salesStage = SalesStage.NOUVEAU;

                // 5. Persistence
                const source = this.mapSource(raw.source);

                await prisma.lead.create({
                    data: {
                        organisationId: orgId,
                        firstName: firstName,
                        lastName: lastName,
                        email: normalizedEmail,
                        phone: normalizedPhone,
                        street: raw.street || '',
                        zipCode: raw.zip || '',
                        city: raw.city || '',
                        source: source,
                        status: status,
                        salesStage: salesStage,
                        score: isQuarantined ? 0 : (diffDays <= 30 ? 90 : 50),
                        metadata: {
                            raw_branch_id: raw.branch_id,
                            raw_exam_id: raw.examen_id,
                            ingestion_source: 'API_BULK',
                            quarantine_reason: quarantineReason || undefined
                        }
                    }
                });

                if (isQuarantined) {
                    quarantined++;
                } else {
                    created++;
                    if (status === LeadStatus.PROSPECT && diffDays <= 30) createdCrm++;
                    else createdProspection++;
                }

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
            quarantined,
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
