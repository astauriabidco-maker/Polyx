import { Lead, LeadStatus, CallOutcome, RefusalReason, LeadHistoryEntry, SalesStage } from '@/domain/entities/lead';

/**
 * LeadService Domain Logic
 * Contains business rules for Smart Queue filtering and Interaction handling.
 * This is effectively a Repository + Domain Service pattern.
 */
export class LeadService {

    // --- Smart Queues Logic ---

    /**
     * Queue: "Into the Pipe"
     * New leads that haven't been touched yet.
     */
    static getProvisionedQueue<T extends Lead>(leads: T[]): T[] {
        return leads.filter(l =>
            (l.status === LeadStatus.PROSPECT && l.salesStage !== SalesStage.NOUVEAU) ||
            (l.status === LeadStatus.PROSPECTION && l.callAttempts === 0)
        )
            .filter(l => !l.nextCallbackAt)
            .sort((a, b) => {
                const dateA = new Date(a.responseDate || 0).getTime();
                const dateB = new Date(b.responseDate || 0).getTime();
                return dateB - dateA; // Recent first
            });
    }

    /**
     * Queue: "Hot & Priorities"
     * AI High Score (>75) AND Not Disqualified/Archived/Converted.
     * Includes Leads currently in PROSPECTION (e.g. no answer yet but high potential).
     */
    static getPriorityQueue<T extends Lead>(leads: T[]): T[] {
        return leads.filter(l =>
            l.score > 75 &&
            [LeadStatus.PROSPECT, LeadStatus.PROSPECTION, LeadStatus.ATTEMPTED].includes(l.status) &&
            l.salesStage !== SalesStage.NOUVEAU // Exclude CRM leads
        ).sort((a, b) => {
            const dateA = new Date(a.responseDate || 0).getTime();
            const dateB = new Date(b.responseDate || 0).getTime();
            return dateB - dateA; // Recent first
        });
    }

    /**
     * Queue: "Callbacks"
     * Leads with a scheduled callback either in the past (overdue) or imminent (next 2 hours).
     */
    static getCallbackQueue<T extends Lead>(leads: T[]): T[] {
        const now = new Date().getTime();
        // Look ahead 2 hours
        const horizon = now + 2 * 60 * 60 * 1000;

        return leads.filter(l => {
            if (!l.nextCallbackAt) return false;
            const callbackTime = new Date(l.nextCallbackAt).getTime();
            return callbackTime <= horizon &&
                ![LeadStatus.DISQUALIFIED, LeadStatus.QUALIFIED, LeadStatus.RDV_FIXE, LeadStatus.ARCHIVED].includes(l.status);
        }).sort((a, b) => {
            const timeA = new Date(a.nextCallbackAt!).getTime();
            const timeB = new Date(b.nextCallbackAt!).getTime();
            return timeA - timeB;
        });
    }

    // --- Interaction Logic ---

    /**
     * Injects a new lead into the system with routing rules.
     * Rule 1: If responseDate < 30 days -> CRM (PROSPECT + NOUVEAU).
     * Rule 2: If responseDate > 30 days -> PROSPECTION (PROSPECT).
     */
    static injectLead(lead: Lead): Lead {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // All leads start as PROSPECT
        lead.status = LeadStatus.PROSPECT;

        // Check "Freshness"
        // If responseDate is recent (after 30 days ago) -> Fresh -> CRM
        if (lead.responseDate && lead.responseDate > thirtyDaysAgo) {
            lead.salesStage = SalesStage.NOUVEAU; // Mark for CRM
            lead.score = 100; // Boost score
        } else {
            // No Sales Stage -> Prospection
            // lead.salesStage = undefined;
        }

        return lead;
    }

    /**
     * Register a call outcome and update status/history automatically.
     */
    static registerInteraction(
        lead: Lead,
        userId: string,
        outcome: CallOutcome,
        data?: { nextCallback?: Date, refusalReason?: RefusalReason, note?: string }
    ): Lead {
        const updatedLead = { ...lead };
        updatedLead.callAttempts += 1;
        updatedLead.lastCallDate = new Date();
        updatedLead.updatedAt = new Date();

        // Create Log Entry
        const logEntry: LeadHistoryEntry = {
            type: 'CALL_LOG',
            timestamp: new Date(),
            userId,
            details: { outcome, data }
        };

        // Status Transitions based on Outcome
        let newStatus = updatedLead.status;

        switch (outcome) {
            case CallOutcome.APPOINTMENT_SET:
                // Move directly to RDV_FIXE -> CRM
                newStatus = LeadStatus.RDV_FIXE;
                updatedLead.salesStage = SalesStage.RDV_FIXE; // Explicitly set Stage
                break;

            case CallOutcome.CALLBACK_SCHEDULED:
                if (data?.nextCallback) updatedLead.nextCallbackAt = data.nextCallback;
                newStatus = LeadStatus.PROSPECTION;
                break;

            case CallOutcome.NO_ANSWER:
                newStatus = LeadStatus.ATTEMPTED;
                if (updatedLead.callAttempts >= 6) {
                    // Auto-NRP rule after 6 attempts
                    newStatus = LeadStatus.NRP;
                }
                break;

            case CallOutcome.REFUSAL:
                newStatus = LeadStatus.DISQUALIFIED; // User mentioned "Archive" but Disqualified is standard. We can auto-archive later.
                break;

            case CallOutcome.WRONG_NUMBER:
                newStatus = LeadStatus.ARCHIVED; // Move to Archive
                break;
        }

        // Record status change if it happened
        if (newStatus !== lead.status) {
            updatedLead.history.push({
                type: 'STATUS_CHANGE',
                timestamp: new Date(),
                userId,
                details: { oldStatus: lead.status, newStatus }
            });
            updatedLead.status = newStatus;
        }

        // Add note log if present
        if (data?.note) {
            updatedLead.history.push({
                type: 'NOTE',
                timestamp: new Date(),
                userId,
                details: { note: data.note }
            });
        }

        updatedLead.history.push(logEntry);

        return updatedLead;
    }

    /**
     * Identifies which Smart Queue a lead belongs to.
     */
    static getSmartQueueType(lead: Lead): 'provisioned' | 'priority' | 'callback' | 'other' {
        // 1. Check Callbacks (High priority scheduling)
        const now = new Date().getTime();
        const horizon = now + 2 * 60 * 60 * 1000;
        if (lead.nextCallbackAt) {
            const callbackTime = new Date(lead.nextCallbackAt).getTime();
            const invalidStatus = [LeadStatus.DISQUALIFIED, LeadStatus.QUALIFIED, LeadStatus.RDV_FIXE, LeadStatus.ARCHIVED].includes(lead.status as LeadStatus);
            if (callbackTime <= horizon && !invalidStatus) {
                return 'callback';
            }
        }

        // 2. Check Priority (AI High Score)
        if (lead.score > 75 &&
            [LeadStatus.PROSPECT, LeadStatus.PROSPECTION, LeadStatus.ATTEMPTED].includes(lead.status as LeadStatus) &&
            lead.salesStage !== SalesStage.NOUVEAU) {
            return 'priority';
        }

        // 3. Check Provisioned (The Pipe)
        const isProvisioned = (
            (lead.status === LeadStatus.PROSPECT && lead.salesStage !== SalesStage.NOUVEAU) ||
            (lead.status === LeadStatus.PROSPECTION && lead.callAttempts === 0)
        ) && !lead.nextCallbackAt;

        if (isProvisioned) return 'provisioned';

        return 'other';
    }

    static getScoringInsights(lead: Lead): { label: string, icon: string, type: 'positive' | 'neutral' | 'negative' }[] {
        const insights: { label: string, icon: string, type: 'positive' | 'neutral' | 'negative' }[] = [];

        // 1. Freshness
        const hoursAgo = (new Date().getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 24) {
            insights.push({ label: 'Lead très récent (< 24h)', icon: '🔥', type: 'positive' });
        }

        // 2. Score mapping
        if (lead.score >= 80) {
            insights.push({ label: 'Intention d\'achat élevée', icon: '🎯', type: 'positive' });
        } else if (lead.score >= 50) {
            insights.push({ label: 'Intérêt modéré à confirmer', icon: '⚖️', type: 'neutral' });
        }

        // 3. Activity
        if (lead.callAttempts === 0) {
            insights.push({ label: 'Premier contact à établir', icon: '📞', type: 'positive' });
        } else if (lead.callAttempts > 3) {
            insights.push({ label: 'Lead difficile à joindre', icon: '⚠️', type: 'negative' });
        }

        // 4. Source specific
        if (lead.source?.toLowerCase().includes('recommend')) {
            insights.push({ label: 'Source Recommandation (Haute Confiance)', icon: '🤝', type: 'positive' });
        }

        return insights;
    }
}
