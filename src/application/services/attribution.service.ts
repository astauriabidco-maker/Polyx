import { prisma } from '@/lib/prisma';

export enum AttributionModel {
    FIRST_TOUCH = 'FIRST_TOUCH',
    LAST_TOUCH = 'LAST_TOUCH',
    LINEAR = 'LINEAR',
    U_SHAPED = 'U_SHAPED'
}

export interface Touchpoint {
    type: string;
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
    referrer?: string;
    pageUrl?: string;
    metadata?: any;
    createdAt?: Date;
}

export class AttributionService {
    /**
     * Records a new touchpoint for a lead.
     */
    static async recordTouchpoint(leadId: string, touchpoint: Touchpoint) {
        return await (prisma as any).leadTouchpoint.create({
            data: {
                leadId,
                type: touchpoint.type,
                source: touchpoint.source,
                medium: touchpoint.medium,
                campaign: touchpoint.campaign,
                content: touchpoint.content,
                term: touchpoint.term,
                referrer: touchpoint.referrer,
                pageUrl: touchpoint.pageUrl,
                metadata: touchpoint.metadata
            }
        });
    }

    /**
     * Calculates attribution weights for touchpoints based on a specific model.
     */
    static calculateAttribution(touchpoints: Touchpoint[], model: AttributionModel = AttributionModel.LAST_TOUCH): { source: string, weight: number }[] {
        if (!touchpoints || touchpoints.length === 0) return [];

        // Sort touchpoints by date ASC
        const sorted = [...touchpoints].sort((a, b) =>
            (new Date(a.createdAt || 0).getTime()) - (new Date(b.createdAt || 0).getTime())
        );

        const results: { source: string, weight: number }[] = [];

        switch (model) {
            case AttributionModel.FIRST_TOUCH:
                results.push({ source: sorted[0].source || 'Direct', weight: 1.0 });
                break;

            case AttributionModel.LAST_TOUCH:
                results.push({ source: sorted[sorted.length - 1].source || 'Direct', weight: 1.0 });
                break;

            case AttributionModel.LINEAR:
                const weight = 1.0 / sorted.length;
                sorted.forEach(tp => {
                    results.push({ source: tp.source || 'Direct', weight });
                });
                break;

            case AttributionModel.U_SHAPED:
                if (sorted.length === 1) {
                    results.push({ source: sorted[0].source || 'Direct', weight: 1.0 });
                } else {
                    // 40% First, 40% Last, 20% others
                    results.push({ source: sorted[0].source || 'Direct', weight: 0.4 });
                    results.push({ source: sorted[sorted.length - 1].source || 'Direct', weight: 0.4 });

                    if (sorted.length > 2) {
                        const middleWeight = 0.2 / (sorted.length - 2);
                        for (let i = 1; i < sorted.length - 1; i++) {
                            results.push({ source: sorted[i].source || 'Direct', weight: middleWeight });
                        }
                    } else if (sorted.length === 2) {
                        // Adjust if only 2: 50/50
                        results[0].weight = 0.5;
                        results[1].weight = 0.5;
                    }
                }
                break;
        }

        // Aggregate by source
        const aggregated = results.reduce((acc, curr) => {
            const existing = acc.find(a => a.source === curr.source);
            if (existing) {
                existing.weight += curr.weight;
            } else {
                acc.push({ ...curr });
            }
            return acc;
        }, [] as { source: string, weight: number }[]);

        return aggregated.sort((a, b) => b.weight - a.weight);
    }
}
