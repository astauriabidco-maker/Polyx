'use client';

import { Activity, Users, Star, Trophy } from 'lucide-react';
import { ProviderStats } from '@/application/actions/analytics.providers.actions';
import { KPICard } from '@/components/ui/kpi-card';

export function ProviderKPICards({ stats }: { stats: ProviderStats }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <KPICard
                title="Total Leads Intégrés"
                value={stats.totalLeads}
                icon={Activity}
                trend="+12%"
                trendDirection="up"
                color="indigo"
            />
            <KPICard
                title="Partenaires Actifs"
                value={stats.activeProviders}
                icon={Users}
                color="blue"
            />
            <KPICard
                title="Taux Qualification"
                value={`${stats.acceptanceRate}%`}
                icon={Star}
                trend="Stable"
                color="green"
            />
            <KPICard
                title="Meilleur Partenaire"
                value={stats.topProvider.name}
                icon={Trophy}
                trend={`${stats.topProvider.quality}% Qual.`}
                trendDirection="neutral"
                color="orange"
            />
        </div>
    );
}
