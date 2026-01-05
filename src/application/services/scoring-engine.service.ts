import { prisma } from '@/lib/prisma';
import { Lead } from '@/domain/entities/lead';

export interface ScoringWeights {
    [key: string]: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
    'PAGE_VIEW': 2,
    'FORM_INTERACTION': 10,
    'EMAIL_OPEN': 5,
    'EMAIL_CLICK': 15,
    'PRICING_VIEW': 25,
    'DOWNLOAD': 20,
    'FRESHNESS_BONUS': 20, // Less than 24h
};

export class ScoringEngine {
    /**
     * Calculates a predictive score based on recent behavioral events and profile data.
     */
    static async calculatePredictiveScore(leadId: string): Promise<number> {
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { activities: { where: { type: 'BEHAVIORAL_EVENT' } } }
        });

        if (!lead) return 50;

        let score = 50; // Base score

        // 1. Behavioral Contributions
        const activities = lead.activities || [];
        activities.forEach(activity => {
            const eventType = activity.content || '';
            const weight = DEFAULT_WEIGHTS[eventType] || 0;

            // Apply decay based on age of activity (optional complexity)
            const daysAgo = (new Date().getTime() - activity.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            const decayFactor = Math.max(0, 1 - (daysAgo / 30)); // 30 days decay

            score += weight * decayFactor;
        });

        // 2. Freshness Signal
        const hoursAgo = (new Date().getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 24) {
            score += DEFAULT_WEIGHTS['FRESHNESS_BONUS'];
        }

        // 3. Negative signals (optional)
        if (lead.callAttempts > 3) score -= 10;

        // Clamp 0-100
        return Math.min(100, Math.max(0, Math.round(score)));
    }

    /**
     * Bulk refresh scores for a set of leads.
     */
    static async refreshLeadsScores(leadIds: string[]) {
        for (const id of leadIds) {
            const newScore = await this.calculatePredictiveScore(id);
            await prisma.lead.update({
                where: { id },
                data: { score: newScore }
            });
        }
    }
}
