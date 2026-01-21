import { prisma } from '@/lib/prisma';
import { LeadStatus, SalesStage } from '@/domain/entities/lead';

interface ProviderRoiMetrics {
    providerId: string;
    providerName: string;
    totalLeads: number;
    qualifiedLeads: number;
    conversionRate: number; // %

    // Financials
    totalCost: number;
    costPerLead: number; // Average or configured
    revenuePotential: number; // Estimated
    roi: number; // Revenue / Cost (multiplier, e.g. 3.5x)
}

interface ProviderInsight {
    type: 'SUCCESS' | 'WARNING' | 'DANGER' | 'INFO';
    message: string;
    action?: string;
    metric?: string; // e.g. "Conversion Rate: 45%"
}

export class ProviderAnalyticsService {

    private static AVERAGE_PACK_PRICE = 1500; // Euros (Estimated average value of a sale)

    /**
     * Calculates extensive ROI metrics for a specific provider or all providers.
     */
    static async getProviderPerformance(providerId?: string): Promise<{ metrics: ProviderRoiMetrics[], globalRoi: number }> {
        const whereClause = providerId ? { providerId } : { providerId: { not: null } };

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { provider: true }
        });

        // Group by provider
        const grouped = new Map<string, typeof leads>();
        leads.forEach(l => {
            if (!l.providerId) return;
            if (!grouped.has(l.providerId)) grouped.set(l.providerId, []);
            grouped.get(l.providerId)!.push(l);
        });

        const metrics: ProviderRoiMetrics[] = [];
        let totalGlobalCost = 0;
        let totalGlobalRevenue = 0;

        for (const [pid, pLeads] of grouped.entries()) {
            const provider = pLeads[0].provider;
            // In a real scenario, we might need to fetch provider separately if leads list is empty, 
            // but here we iterate on leads so provider exists.
            if (!provider) continue;

            const total = pLeads.length;
            const qualified = pLeads.filter(l => l.status === LeadStatus.QUALIFIED || l.status === LeadStatus.CONTACTED).length;
            const conversionRate = total > 0 ? (qualified / total) * 100 : 0;

            // Cost Calculation
            let cost = 0;
            if (provider.pricingModel === 'CPL') {
                cost = total * provider.costPerLead;
            } else {
                // FIXED model: simplistic approach, assume monthly cost implies this is "all time" or handled by timeframe filter
                // For this V1, let's treat 'costPerLead' as 'Total Cost' if FIXED, or just 0.
                // Better: Assume CPL for now as standard.
                cost = total * provider.costPerLead;
            }

            // Revenue Projection (Qualified leads * Conversion to Sale estimate * Avg Cart)
            // Let's assume 30% of qualified leads become actual sales.
            const estimatedSales = qualified * 0.3;
            const revenue = estimatedSales * this.AVERAGE_PACK_PRICE;

            const roi = cost > 0 ? (revenue / cost) : 0;

            totalGlobalCost += cost;
            totalGlobalRevenue += revenue;

            metrics.push({
                providerId: pid,
                providerName: provider.name,
                totalLeads: total,
                qualifiedLeads: qualified,
                conversionRate,
                totalCost: cost,
                costPerLead: provider.costPerLead,
                revenuePotential: revenue,
                roi
            });
        }

        const globalRoi = totalGlobalCost > 0 ? (totalGlobalRevenue / totalGlobalCost) : 0;

        return { metrics, globalRoi };
    }

    /**
     * AI-driven Insight Engine. 
     * Analyzes metrics to generate human-readable recommendations.
     */
    static generateInsights(metrics: ProviderRoiMetrics): ProviderInsight[] {
        const insights: ProviderInsight[] = [];

        // 1. Quality Analysis
        if (metrics.totalLeads > 10) {
            if (metrics.conversionRate < 10) {
                insights.push({
                    type: 'DANGER',
                    message: "Qualité critique faible.",
                    action: "Renégocier le CPL ou stopper.",
                    metric: `Conv: ${metrics.conversionRate.toFixed(1)}%`
                });
            } else if (metrics.conversionRate > 30) {
                insights.push({
                    type: 'SUCCESS',
                    message: "Excellente qualité de leads.",
                    action: "Augmenter le volume.",
                    metric: `Conv: ${metrics.conversionRate.toFixed(1)}%`
                });
            }
        }

        // 2. Financial Analysis
        if (metrics.totalCost > 0) {
            if (metrics.roi < 1.0) {
                insights.push({
                    type: 'WARNING',
                    message: "Partenaire non rentable.",
                    action: "Audit nécessaire.",
                    metric: `ROI: ${metrics.roi.toFixed(2)}x`
                });
            } else if (metrics.roi > 5.0) {
                insights.push({
                    type: 'SUCCESS',
                    message: "Machine à cash ! ROI exceptionnel.",
                    action: "Scaler au maximum.",
                    metric: `ROI: ${metrics.roi.toFixed(2)}x`
                });
            }
        }

        return insights;
    }
}
