'use server';

import { db } from '@/infrastructure/mock-db';
import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@/domain/entities/lead';

export interface ProviderStats {
    totalLeads: number;
    activeProviders: number;
    acceptanceRate: number; // Percentage of QUALIFIED leads
    topProvider: { name: string; volume: number; quality: number };
    recentLeads: { id: string; name: string; provider: string; date: Date; status: LeadStatus }[];
    volumeByProvider: { name: string; value: number }[];
    timeSeriesData: { date: string; leads: number; qualified: number }[];
    statusDistribution: { name: string; value: number; color: string }[];
}

export async function getProviderDashboardStats(): Promise<ProviderStats> {
    // 1. Fetch real leads from Prisma
    const leads = await prisma.lead.findMany({
        where: {
            providerId: { not: null } // Only API leads
        },
        orderBy: { createdAt: 'desc' }
    });

    // 2. Fetch providers (still Mock for this phase)
    const providers = db.apiProviders;

    const totalLeads = leads.length;
    // Map Prisma status string to Enum if needed, or just compare strings
    const qualifiedLeads = leads.filter(l => l.status === LeadStatus.QUALIFIED || l.status === LeadStatus.CONTACTED).length;
    const acceptanceRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

    // Volume by Provider
    const volumeMap = new Map<string, number>();
    const qualityMap = new Map<string, { total: number, qualified: number }>();

    leads.forEach(lead => {
        const pid = lead.providerId!;
        volumeMap.set(pid, (volumeMap.get(pid) || 0) + 1);

        const currentQ = qualityMap.get(pid) || { total: 0, qualified: 0 };
        currentQ.total++;
        if (lead.status === LeadStatus.QUALIFIED) currentQ.qualified++;
        qualityMap.set(pid, currentQ);
    });

    const volumeByProvider = providers
        .filter(p => volumeMap.has(p.id))
        .map(p => ({
            name: p.name,
            value: volumeMap.get(p.id) || 0
        }));

    // Time Series Data (Last 14 days)
    const timeSeriesMap = new Map<string, { total: number, qualified: number }>();
    // Initialize last 14 days with 0
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        timeSeriesMap.set(dateKey, { total: 0, qualified: 0 });
    }

    leads.forEach(lead => {
        const dateKey = lead.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        if (timeSeriesMap.has(dateKey)) {
            const entry = timeSeriesMap.get(dateKey)!;
            entry.total++;
            if (lead.status === LeadStatus.QUALIFIED || lead.status === LeadStatus.CONTACTED) {
                entry.qualified++;
            }
        }
    });

    const timeSeriesData = Array.from(timeSeriesMap.entries()).map(([date, counts]) => ({
        date,
        leads: counts.total,
        qualified: counts.qualified
    }));

    // Status Distribution
    const statusCounts = new Map<string, number>();
    leads.forEach(l => {
        statusCounts.set(l.status, (statusCounts.get(l.status) || 0) + 1);
    });

    const statusColors: Record<string, string> = {
        [LeadStatus.PROSPECT]: '#3b82f6', // blue-500
        [LeadStatus.PROSPECTION]: '#a855f7', // purple-500
        [LeadStatus.QUALIFIED]: '#22c55e', // green-500
        [LeadStatus.CONTACTED]: '#06b6d4', // cyan-500
        [LeadStatus.DISQUALIFIED]: '#ef4444', // red-500
        [LeadStatus.NRP]: '#f59e0b', // amber-500
    };

    const statusDistribution = Array.from(statusCounts.entries()).map(([status, count]) => ({
        name: status,
        value: count,
        color: statusColors[status] || '#94a3b8'
    }));

    // Find Top Provider
    let topProvider = { name: '-', volume: 0, quality: 0 };
    let maxScore = -1;

    for (const [pid, stats] of qualityMap.entries()) {
        const score = (stats.qualified / stats.total) * 100;
        if (score > maxScore) {
            const pName = providers.find(p => p.id === pid)?.name || 'Unknown';
            maxScore = score;
            topProvider = { name: pName, volume: stats.total, quality: Math.round(score) };
        }
    }

    // Recent Leads Feed
    const recentLeads = leads
        .slice(0, 5) // Leads are already ordered by createdAt desc from Prisma
        .map(l => ({
            id: l.id,
            name: `${l.firstName} ${l.lastName}`,
            provider: providers.find(p => p.id === l.providerId)?.name || 'Unknown',
            date: l.createdAt,
            status: l.status as LeadStatus
        }));

    return {
        totalLeads,
        activeProviders: providers.filter(p => p.isActive).length,
        acceptanceRate,
        topProvider,
        recentLeads,
        volumeByProvider,
        timeSeriesData,
        statusDistribution
    };
}

import { ProviderAnalyticsService } from '@/application/services/provider-analytics.service';

export async function getAdvancedProviderStats() {
    const { metrics, globalRoi } = await ProviderAnalyticsService.getProviderPerformance();

    // Enrich with insights
    const enrichedMetrics = await Promise.all(metrics.map(async m => ({
        ...m,
        insights: await ProviderAnalyticsService.generateInsights(m)
    })));

    return { metrics: enrichedMetrics, globalRoi };
}
