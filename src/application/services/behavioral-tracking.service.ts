import { prisma } from '@/lib/prisma';

export enum LeadEventType {
    PAGE_VIEW = 'PAGE_VIEW',
    FORM_INTERACTION = 'FORM_INTERACTION',
    EMAIL_OPEN = 'EMAIL_OPEN',
    EMAIL_CLICK = 'EMAIL_CLICK',
    PRICING_VIEW = 'PRICING_VIEW',
    DOWNLOAD = 'DOWNLOAD'
}

export class BehavioralTrackingService {
    /**
     * Records a behavioral event for a lead by email or ID.
     */
    static async logEvent(identifier: { email?: string, leadId?: string }, type: LeadEventType, metadata: any = {}) {
        let leadId = identifier.leadId;

        if (!leadId && identifier.email) {
            const lead = await prisma.lead.findFirst({ where: { email: identifier.email } });
            leadId = lead?.id;
        }

        if (!leadId) return { success: false, error: 'Lead not found' };

        // We use LeadActivity table with a specific metadata structure for now
        // to avoid a schema migration in this phase, but we tag it clearly.
        await prisma.leadActivity.create({
            data: {
                leadId: leadId,
                userId: 'system', // Automated event
                type: 'BEHAVIORAL_EVENT',
                content: type,
                metadata: JSON.stringify({
                    ...metadata,
                    isBehavioral: true,
                    timestamp: new Date()
                })
            }
        });

        return { success: true };
    }
}
