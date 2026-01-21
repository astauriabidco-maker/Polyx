import { Lead, LeadStatus, CallOutcome, RefusalReason, LeadHistoryEntry, SalesStage } from '@/domain/entities/lead';
import { AttributionService } from './attribution.service';

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
     * Advanced Weighted Scoring Engine (Business-Centric V2)
     * Prioritizes Speed-to-Lead and Financing Eligibility.
     */
    static calculateScore(lead: Partial<Lead>): number {
        let score = 30; // Base score

        // 1. Freshness Weight (Speed-to-Lead) - CRITICAL
        const createdAt = lead.createdAt ? new Date(lead.createdAt).getTime() : Date.now();
        const now = Date.now();
        const fifteenMinAgo = now - (15 * 60 * 1000);
        const twoHoursAgo = now - (2 * 60 * 60 * 1000);

        if (createdAt > fifteenMinAgo) {
            score += 30; // Ultra high priority
        } else if (createdAt > twoHoursAgo) {
            score += 10;
        }

        // 2. Data Completeness (+20 pts)
        if (lead.email && lead.phone) {
            score += 20;
        }

        // 3. Financing Eligibility (+20 pts)
        // Values from domain: SALARIE, CDI, CDD, INDEPENDANT, CHOMAGE
        const eligibleStatus = ['salarie', 'cdi', 'cdd', 'independant', 'chomage'];
        if (lead.jobStatus && eligibleStatus.includes(lead.jobStatus.toLowerCase())) {
            score += 20;
        }

        // 4. Source Weight (Balanced +10/20 pts)
        const premiumSources = ['facebook_ads', 'google_ads', 'landing_page', 'recommandation', 'meta'];
        if (lead.source && premiumSources.includes(lead.source.toLowerCase())) {
            score += 10;
        }

        // 5. Project Definition (+10 pts)
        if (lead.examId) {
            score += 10;
        }

        return Math.min(100, score);
    }

    /**
     * Injects a new lead into the system with routing rules.
     * Calculates initial score and determines initial stage.
     */
    static injectLead(lead: Lead): Lead {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // All leads start as PROSPECT
        lead.status = LeadStatus.PROSPECT;

        // Calculate Score
        lead.score = this.calculateScore(lead);

        // Check Freshness for CRM vs Prospection
        // CRM (Hot Leads): recent AND high score
        if (lead.score > 75 || (lead.responseDate && lead.responseDate > thirtyDaysAgo)) {
            lead.salesStage = SalesStage.NOUVEAU;
        }

        // Automatic Touchpoint Creation (Initial)
        // If source is present, create an initial touchpoint
        if (lead.source && (!lead.touchpoints || lead.touchpoints.length === 0)) {
            lead.touchpoints = [{
                type: 'LEAD_GENERATION',
                source: lead.source,
                createdAt: new Date()
            }];
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
                if (data?.nextCallback) updatedLead.nextCallbackAt = data.nextCallback;
                break;

            case CallOutcome.CALLBACK_SCHEDULED:
                if (data?.nextCallback) updatedLead.nextCallbackAt = data.nextCallback;
                newStatus = LeadStatus.PROSPECTION;
                break;

            case CallOutcome.ANSWERED:
                // Spoke with lead, decision pending -> CONTACTED
                newStatus = LeadStatus.CONTACTED;
                break;

            case CallOutcome.NO_ANSWER:
            case CallOutcome.BUSY:
            case CallOutcome.VOICEMAIL:
                // Failed to reach -> ATTEMPTED
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

    /**
     * "Smart Distribution" / "Load Balancing" Logic.
     * Updates: 
     * - Returns the userId of the candidate based on the distribution mode.
     * - Modes: 'ROUND_ROBIN' (Circular), 'LOAD_BALANCED' (Lowest Score), 'SKILL_BASED' (Future).
     */
    static getBestCandidate(
        candidates: { userId: string, loadScore: number, lastAssignedAt?: Date }[],
        mode: 'ROUND_ROBIN' | 'LOAD_BALANCED' | 'SKILL_BASED' = 'LOAD_BALANCED'
    ): string | null {
        if (!candidates || candidates.length === 0) return null;

        if (mode === 'LOAD_BALANCED') {
            // Strategy: Lowest active leads (Standard Load Balancing)
            // Sort by score ASC (lowest load first)
            const sorted = [...candidates].sort((a, b) => a.loadScore - b.loadScore);
            return sorted[0].userId;
        }

        if (mode === 'ROUND_ROBIN') {
            // Strategy: Longest time since last assignment
            // Requires tracking 'lastAssignedAt' or 'leadsToday'
            // For now, simplify: we rely on 'leads assigned today' as the score for Round Robin, 
            // OR if loadScore IS total active leads, Round Robin usually means "balanced count".
            // True Round Robin requires sequence tracking. 
            // Let's implement a "Fair Share" Round Robin using counts:
            // The one with the LEAST assignments TODAY gets the next one.
            // If loadScore represents "Leads assigned today", then sort by score ASC works same as Load Balanced but for a different metric.

            // Assuming loadScore passed here is the metric relevant to the mode.
            const sorted = [...candidates].sort((a, b) => a.loadScore - b.loadScore);
            return sorted[0].userId;
        }

        return candidates[0].userId; // Fallback
    }

    static getScoringInsights(lead: Lead): { label: string, icon: string, type: 'positive' | 'neutral' | 'negative' }[] {
        const insights: { label: string, icon: string, type: 'positive' | 'neutral' | 'negative' }[] = [];

        // 1. Freshness
        const minutesAgo = (new Date().getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60);
        if (minutesAgo < 15) {
            insights.push({ label: 'Lead Ultra-Frais (< 15 min)', icon: '⚡', type: 'positive' });
        } else if (minutesAgo < 120) {
            insights.push({ label: 'Lead récent (< 2h)', icon: '🔥', type: 'positive' });
        }

        // 2. Eligibility
        const eligibleStatus = ['salarie', 'cdi', 'cdd', 'independant', 'chomage'];
        if (lead.jobStatus && eligibleStatus.includes(lead.jobStatus.toLowerCase())) {
            insights.push({ label: 'Potentiel Financement Élevé', icon: '💰', type: 'positive' });
        }

        // 3. Score mapping
        if (lead.score >= 80) {
            insights.push({ label: 'Priorité Haute', icon: '🎯', type: 'positive' });
        } else if (lead.score >= 50) {
            insights.push({ label: 'Bon potentiel', icon: '👍', type: 'neutral' });
        }

        // 4. Project
        if (lead.examId) {
            insights.push({ label: 'Projet de certification défini', icon: '🎓', type: 'positive' });
        }

        // 5. Activity
        if (lead.callAttempts === 0) {
            insights.push({ label: 'Premier contact à établir', icon: '📞', type: 'neutral' });
        } else if (lead.callAttempts > 4) {
            insights.push({ label: 'Difficile à joindre', icon: '⚠️', type: 'negative' });
        }

        return insights;
    }
}
