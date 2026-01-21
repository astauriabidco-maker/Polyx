import { prisma } from '@/lib/prisma';
import { LeadStatus, SalesStage } from '@/domain/entities/lead';
import { AttributionService, Touchpoint } from './attribution.service';
import { normalizePhone, normalizeEmail, capitalize } from '@/lib/data-utils';

export interface AdsLeadPayload {
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string;
    source: 'META' | 'GOOGLE_ADS';
    campaignName?: string;
    adsetName?: string;
    adName?: string;
    keyword?: string;
    metadata?: any;
    organisationId: string;
}

export class AdsConnectorService {
    /**
     * Ingests a lead from an external Ads API.
     */
    static async ingestAdsLead(payload: AdsLeadPayload) {
        // 1. Normalize
        const normalizedEmail = normalizeEmail(payload.email);
        const normalizedPhone = normalizePhone(payload.phone || '');
        const firstName = capitalize(payload.firstName);
        const lastName = capitalize(payload.lastName || '');

        // 2. Deduplication check
        let existingLead = await prisma.lead.findFirst({
            where: {
                organisationId: payload.organisationId,
                OR: [
                    { email: normalizedEmail },
                    { phone: normalizedPhone }
                ]
            }
        });

        let leadId: string;

        if (existingLead) {
            leadId = existingLead.id;
            // Update existing lead with enrichment data
            await prisma.lead.update({
                where: { id: leadId },
                data: {
                    metadata: {
                        ...(existingLead.metadata as any),
                        last_ads_ingestion: new Date().toISOString(),
                        ad_name: payload.adName,
                        keyword: payload.keyword
                    }
                }
            });
        } else {
            // Create New Lead
            const newLead = await prisma.lead.create({
                data: {
                    organisationId: payload.organisationId,
                    firstName,
                    lastName,
                    email: normalizedEmail,
                    phone: normalizedPhone,
                    source: payload.source,
                    status: LeadStatus.PROSPECT,
                    salesStage: SalesStage.NOUVEAU,
                    score: 95, // Direct ads leads are high intent
                    metadata: {
                        campaign_name: payload.campaignName,
                        adset_name: payload.adsetName,
                        ad_name: payload.adName,
                        keyword: payload.keyword,
                        ...payload.metadata
                    }
                }
            });
            leadId = newLead.id;
        }

        // 3. Create Touchpoint for Attribution
        const touchpoint: Touchpoint = {
            type: 'AD_CLICK',
            source: payload.source === 'META' ? 'facebook' : 'google_ads',
            medium: 'cpc',
            campaign: payload.campaignName,
            content: payload.adName,
            term: payload.keyword,
            metadata: {
                adset_name: payload.adsetName,
                ...payload.metadata
            },
            createdAt: new Date()
        };

        await AttributionService.recordTouchpoint(leadId, touchpoint);

        return { success: true, leadId };
    }

    /**
     * Native Meta Leads API Hook (Simplified)
     */
    static async handleMetaLead(orgId: string, formPayload: any) {
        // In a real scenario, we'd fetch the lead details using the lead_gen_id
        // via Meta Graph API. Here we assume the payload is already processed/simplified.
        const leadData: AdsLeadPayload = {
            organisationId: orgId,
            source: 'META',
            firstName: formPayload.first_name || 'Prospect',
            lastName: formPayload.last_name,
            email: formPayload.email,
            phone: formPayload.phone,
            campaignName: formPayload.campaign_name,
            adName: formPayload.ad_name,
            metadata: {
                meta_lead_id: formPayload.lead_id,
                form_id: formPayload.form_id
            }
        };

        return await this.ingestAdsLead(leadData);
    }

    /**
     * Native Google Ads Lead Form Webhook Hook
     */
    static async handleGoogleLead(orgId: string, googlePayload: any) {
        // Google Lead Form Webhook structure: 
        // { user_column_data: [...], google_key: '...', adgroup_id: '...', ... }
        const extractField = (name: string) => googlePayload.user_column_data?.find((c: any) => c.column_name === name)?.string_value;

        const leadData: AdsLeadPayload = {
            organisationId: orgId,
            source: 'GOOGLE_ADS',
            firstName: extractField('First Name') || 'Prospect',
            lastName: extractField('Last Name'),
            email: extractField('User Email'),
            phone: extractField('User Phone'),
            campaignName: `Google Campaign ${googlePayload.campaign_id}`,
            keyword: googlePayload.keyword,
            metadata: {
                google_lead_id: googlePayload.lead_id,
                adgroup_id: googlePayload.adgroup_id,
                creative_id: googlePayload.creative_id
            }
        };

        return await this.ingestAdsLead(leadData);
    }
}
