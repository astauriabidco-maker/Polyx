'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Phone, CheckCircle, Target } from 'lucide-react';
import { getTransformationLeaderboardAction } from '@/application/actions/metrics.actions';

interface TransformationStats {
    id: string;
    name: string;
    image: string | null;
    totalCalls: number;
    convertedLeads: number;
    rate: number;
}

export function TransformationLeaderboard({ orgId }: { orgId: string }) {
    const [data, setData] = useState<TransformationStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (orgId) {
            loadData();
        }
    }, [orgId]);

    const loadData = async () => {
        setIsLoading(true);
        const res = await getTransformationLeaderboardAction(orgId);
        if (res.success && res.data) {
            setData(res.data as any);
        }
        setIsLoading(false);
    };

    if (isLoading) {
        return (
            <Card className="bg-slate-900 border-slate-800 text-slate-50 h-full">
                <CardContent className="flex items-center justify-center h-64 text-slate-500">
                    Chargement des performances...
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-slate-900 border-slate-800 text-slate-50 h-full overflow-hidden flex flex-col">
            <CardHeader className="border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Target size={18} className="text-indigo-400" />
                        <CardTitle className="text-lg">Performance de Conversion</CardTitle>
                    </div>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Appels → Ventes
                    </span>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                <div className="divide-y divide-slate-800/50">
                    {data.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            Aucune donnée de transformation disponible.
                        </div>
                    ) : (
                        data.map((agent, index) => (
                            <div key={agent.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-center gap-4">
                                {/* Rank */}
                                <div className="w-6 text-center font-mono text-sm font-bold text-slate-600">
                                    {index + 1}
                                </div>

                                {/* Avatar */}
                                <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-400 overflow-hidden shrink-0">
                                    {agent.image ? (
                                        <img src={agent.image} alt={agent.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{agent.name.split(' ').map(n => n[0]).join('')}</span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm truncate text-slate-100">{agent.name}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500" title="Appels totaux">
                                            <Phone size={10} /> {agent.totalCalls}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-emerald-500" title="Ventes (RDV Fixés)">
                                            <CheckCircle size={10} /> {agent.convertedLeads}
                                        </div>
                                    </div>
                                </div>

                                {/* Rate & Progress */}
                                <div className="text-right w-24 shrink-0">
                                    <div className="flex items-center justify-end gap-1.5 mb-1.5">
                                        <span className={`text-sm font-bold ${agent.rate > 20 ? 'text-emerald-400' : agent.rate > 10 ? 'text-indigo-400' : 'text-slate-400'}`}>
                                            {agent.rate}%
                                        </span>
                                        <TrendingUp size={12} className={agent.rate > 15 ? 'text-emerald-500' : 'text-slate-600'} />
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${agent.rate > 20 ? 'bg-emerald-500' : agent.rate > 10 ? 'bg-indigo-500' : 'bg-slate-600'}`}
                                            style={{ width: `${Math.min(agent.rate, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
