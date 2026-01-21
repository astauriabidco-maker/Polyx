'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/application/store/auth-store';
import { getMarketingRoiAction } from '@/application/actions/nurturing.actions';
import { TrendingUp, Users, Target, Activity, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function MarketingRoiWidget() {
    const { activeOrganization } = useAuthStore();
    const [roiData, setRoiData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (activeOrganization) {
            loadStats();
        }
    }, [activeOrganization]);

    const loadStats = async () => {
        if (!activeOrganization) return;
        setIsLoading(true);
        const res = await getMarketingRoiAction(activeOrganization.id);
        if (res.success) {
            setRoiData(res.data || []);
        }
        setIsLoading(false);
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-slate-900/10 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    // Identify Best Performer
    const bestPerformer = roiData.length > 0 ? roiData[0] : null;

    return (
        <div className="space-y-6 mb-10">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-none shadow-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-100 flex items-center gap-2">
                            <Target size={16} /> Meilleure Conversion
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{bestPerformer ? `${bestPerformer.rate}%` : '0%'}</div>
                        <p className="text-xs text-indigo-200 mt-1 truncate">
                            {bestPerformer ? bestPerformer.name : 'Aucune donnée'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 text-slate-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <Users size={16} /> Volume Engagé
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {roiData.reduce((acc, curr) => acc + curr.totalEnrolled, 0)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Leads touchés par le nurturing</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 text-slate-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <Activity size={16} /> En Cours
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {roiData.reduce((acc, curr) => acc + curr.active, 0)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Leads actuellement dans une boucle</p>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-950/30 border-emerald-900/50 text-emerald-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                            <TrendingUp size={16} /> Leads Convertis
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-400">
                            {roiData.reduce((acc, curr) => acc + curr.converted, 0)}
                        </div>
                        <p className="text-xs text-emerald-600/70 mt-1">Ayant généré un RDV ou une Vente</p>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Table */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="text-indigo-600" />
                        Performance par Séquence
                    </CardTitle>
                    <CardDescription>
                        Analyse détaillée de l'impact de chaque campagne sur vos conversions.
                    </CardDescription>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Nom de la Séquence</th>
                                <th className="px-6 py-4 text-center">Volume</th>
                                <th className="px-6 py-4 text-center">En Cours</th>
                                <th className="px-6 py-4 text-center">Convertis</th>
                                <th className="px-6 py-4 text-right">Taux de Transformation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {roiData.map((seq, idx) => (
                                <tr key={seq.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                                        <div className={`
                                            flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold
                                            ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}
                                        `}>
                                            {idx + 1}
                                        </div>
                                        {seq.name}
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-600">{seq.totalEnrolled}</td>
                                    <td className="px-6 py-4 text-center text-slate-600">
                                        <Badge variant="outline" className="font-normal border-slate-200 text-slate-500">
                                            {seq.active}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-emerald-600">
                                        {seq.converted}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${seq.rate > 20 ? 'bg-emerald-500' : seq.rate > 10 ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                                    style={{ width: `${seq.rate}%` }}
                                                />
                                            </div>
                                            <span className={`font-bold ${seq.rate > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                                                {seq.rate}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {roiData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                                        Pas assez de données pour l'analyse. Lancez des campagnes pour voir les résultats.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
