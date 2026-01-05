import { Suspense } from 'react';
import { getNetworkStatsAction } from '@/application/actions/network.actions';
import { NetworkMap } from '@/components/supervision/network-map';
import { NetworkFeed } from '@/components/supervision/network-feed';
import { KPICard } from '@/components/ui/kpi-card';
import { Users, TrendingUp, Activity, Globe } from 'lucide-react';

export default async function SupervisionPage() {
    const res = await getNetworkStatsAction();
    const stats = res.stats;

    if (!stats) {
        return <div className="p-10 text-center text-red-500">Erreur lors du chargement des statistiques réseau.</div>;
    }

    return (
        <div className="p-8 bg-slate-950 min-h-screen text-slate-50 pb-20">
            {/* Header */}
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Globe className="text-indigo-500" size={32} />
                        Network Console
                    </h1>
                    <p className="text-slate-400">Supervision globale en temps réel des organismes connectés.</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-mono font-bold text-green-400">LIVE</div>
                    <div className="text-xs text-slate-600 uppercase tracking-widest">System Status: Optimal</div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KPICard
                    title="Volume Leads Global"
                    value={stats.totalLeads.toLocaleString()}
                    icon={Users}
                    trend="+12%"
                    trendDirection="up"
                    color="blue"
                />
                <KPICard
                    title="Chiffre d'Affaires Est."
                    value={`${(stats.totalTurnover / 1000).toFixed(0)}k€`}
                    icon={TrendingUp}
                    trend="+8%"
                    trendDirection="up"
                    color="green"
                />
                <KPICard
                    title="Agents Connectés"
                    value={stats.activeAgents.toString()}
                    icon={Activity}
                    trend="Stable"
                    trendDirection="neutral"
                    color="purple"
                />
                <KPICard
                    title="Score Santé Réseau"
                    value="94/100"
                    icon={Globe}
                    trend="+2"
                    trendDirection="up"
                    color="indigo"
                />
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Map Section (Wide) */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xl font-bold text-slate-200">Répartition Territoriale</h3>
                    <NetworkMap organizations={stats.organizations} />

                    {/* Organization List Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        {stats.organizations.map(org => (
                            <div key={org.id} className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center justify-between hover:border-slate-700 transition-colors">
                                <div>
                                    <div className="font-bold text-slate-200">{org.name}</div>
                                    <div className="text-xs text-slate-500">{org.leadCount} leads</div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-lg font-mono font-bold ${org.healthScore > 80 ? 'text-green-500' : 'text-yellow-500'}`}>
                                        {org.healthScore}%
                                    </div>
                                    <div className="text-[10px] text-slate-600 uppercase">Santé</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Feed */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-200">Live Feed</h3>
                    <NetworkFeed />

                    {/* Mini Widget: Alerts */}
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mt-6">
                        <h4 className="font-bold text-red-400 mb-2 flex items-center gap-2">
                            ⚠️ Alertes Critiques
                        </h4>
                        <p className="text-sm text-red-300/80">
                            Aucune alerte critique détectée sur le réseau. Tous les systèmes sont nominaux.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
