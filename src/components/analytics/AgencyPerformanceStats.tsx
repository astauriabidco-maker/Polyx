'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, Users, Target, Euro } from 'lucide-react';
import { getAgencyPerformanceStatsAction } from '@/application/actions/analytics.actions';

interface AgencyStat {
    agencyId: string;
    agencyName: string;
    totalLeads: number;
    qualifiedLeads: number;
    potentialValue: number;
    conversionRate: number;
}

export function AgencyPerformanceStats({ organisationId }: { organisationId: string }) {
    const [stats, setStats] = useState<AgencyStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, [organisationId]);

    const loadStats = async () => {
        setIsLoading(true);
        const res = await getAgencyPerformanceStatsAction(organisationId);
        if (res.success && res.stats) {
            setStats(res.stats);
        }
        setIsLoading(false);
    };

    if (isLoading) return <div className="text-slate-500 text-sm italic">Analyse des performances territoriales...</div>;
    if (stats.length === 0) return null;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <TrendingUp className="text-emerald-500" size={20} />
                Performances par Agence
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map(stat => (
                    <Card key={stat.agencyId} className="bg-slate-900 border-slate-800 p-4 hover:border-slate-700 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-slate-200">{stat.agencyName}</h4>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Territoire Actif</p>
                            </div>
                            <div className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded text-xs font-bold">
                                {stat.conversionRate}% Conv.
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-500">
                                    <Users size={12} />
                                    <span className="text-[10px] uppercase font-medium">Leads</span>
                                </div>
                                <div className="text-xl font-bold text-slate-100">{stat.totalLeads}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-500">
                                    <Euro size={12} />
                                    <span className="text-[10px] uppercase font-medium">Potentiel</span>
                                </div>
                                <div className="text-xl font-bold text-indigo-400">{(stat.potentialValue / 1000).toFixed(1)}k€</div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 italic">Dernière mise à jour: Aujourd'hui</span>
                            <span className="text-slate-400 font-medium flex items-center gap-1">
                                <Target size={10} />
                                {stat.qualifiedLeads} Qualifiés
                            </span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
