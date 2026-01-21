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

// Dynamic Source Multipliers Cache (refreshed periodically)
interface SourceConversionData {
    source: string;
    totalLeads: number;
    convertedLeads: number;
    conversionRate: number;
    multiplier: number; // 0.5 to 1.5
}

// In-memory cache for source performance (refreshed every 24h in production)
let sourceMultipliersCache: Map<string, number> = new Map();
let lastCacheRefresh: Date = new Date(0);

export class ScoringEngine {

    /**
     * Calculates source-specific multiplier based on historical conversion rates.
     * High-converting sources get a bonus, low-converting sources get a penalty.
     */
    static async getSourceMultiplier(source: string, orgId: string): Promise<number> {
        const cacheKey = `${orgId}:${source}`;

        // Return cached value if fresh (last 24h)
        if (sourceMultipliersCache.has(cacheKey) &&
            (new Date().getTime() - lastCacheRefresh.getTime()) < 24 * 60 * 60 * 1000) {
            return sourceMultipliersCache.get(cacheKey)!;
        }

        try {
            // Calculate conversion rate for this source
            const totalLeads = await prisma.lead.count({
                where: { organisationId: orgId, source: source }
            });

            if (totalLeads < 10) {
                // Not enough data, use neutral multiplier
                sourceMultipliersCache.set(cacheKey, 1.0);
                return 1.0;
            }

            // Converted = leads that reached TRANSFORMATION_APPRENANT stage
            const convertedLeads = await prisma.lead.count({
                where: {
                    organisationId: orgId,
                    source: source,
                    salesStage: 'TRANSFORMATION_APPRENANT'
                }
            });

            const conversionRate = (convertedLeads / totalLeads) * 100;

            // Calculate multiplier: 
            // - 0% conversion = 0.6x (penalty)
            // - 10% conversion = 1.0x (neutral)
            // - 20%+ conversion = 1.4x (bonus)
            const multiplier = Math.min(1.4, Math.max(0.6, 0.6 + (conversionRate / 25)));

            sourceMultipliersCache.set(cacheKey, multiplier);
            lastCacheRefresh = new Date();

            console.log(`[Dynamic Scoring] Source ${source}: ${conversionRate.toFixed(1)}% conversion → ${multiplier.toFixed(2)}x multiplier`);

            return multiplier;
        } catch (error) {
            console.warn('[Dynamic Scoring] Error calculating source multiplier:', error);
            return 1.0;
        }
    }

    /**
     * Calculates a predictive score based on recent behavioral events, profile data, and source performance.
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

        // 4. Dynamic Source Multiplier (NEW)
        const sourceMultiplier = await this.getSourceMultiplier(lead.source || 'UNKNOWN', lead.organisationId);
        score = score * sourceMultiplier;

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

    /**
     * Force refresh of source multipliers cache.
     */
    static clearSourceCache() {
        sourceMultipliersCache.clear();
        lastCacheRefresh = new Date(0);
        console.log('[Dynamic Scoring] Source multipliers cache cleared.');
    }

    /**
     * Get all cached source multipliers for debugging/display.
     */
    static getSourceMultipliersSnapshot(): Map<string, number> {
        return new Map(sourceMultipliersCache);
    }
}
