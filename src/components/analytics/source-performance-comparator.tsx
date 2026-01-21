'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, BarChart3, Loader2 } from 'lucide-react';
import { getSourcePerformanceAction } from '@/application/actions/lead.actions';
import { useAuthStore } from '@/application/store/auth-store';

interface SourceMetrics {
    source: string;
    leadsCount: number;
    avgScore: number;
    conversionRate: number; // Percentage
    trend: 'up' | 'down' | 'stable';
}

function getTrendIcon(trend: 'up' | 'down' | 'stable') {
    switch (trend) {
        case 'up': return <TrendingUp size={14} className="text-emerald-500" />;
        case 'down': return <TrendingDown size={14} className="text-red-500" />;
        default: return <Minus size={14} className="text-slate-500" />;
    }
}

function getScoreColor(score: number): string {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-indigo-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
}

function getConversionColor(rate: number): string {
    if (rate >= 20) return 'bg-emerald-500';
    if (rate >= 10) return 'bg-indigo-500';
    return 'bg-amber-500';
}

export function SourcePerformanceComparator() {
    const { activeOrganization } = useAuthStore();
    const [metrics, setMetrics] = useState<SourceMetrics[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (activeOrganization?.id) {
            loadMetrics();
        }
    }, [activeOrganization?.id]);

    const loadMetrics = async () => {
        setIsLoading(true);
        if (activeOrganization?.id) {
            const res = await getSourcePerformanceAction(activeOrganization.id);
            if (res.success && res.data) {
                setMetrics(res.data);
            }
        }
        setIsLoading(false);
    };

    const totalLeads = metrics.reduce((acc, s) => acc + s.leadsCount, 0);
    const avgConversion = metrics.length > 0
        ? metrics.reduce((acc, s) => acc + s.conversionRate, 0) / metrics.length
        : 0;

    return (
        <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="border-b border-slate-800/50 pb-4">
                <CardTitle className="text-sm uppercase tracking-widest text-indigo-400 font-black flex items-center gap-2">
                    <BarChart3 size={18} /> Comparateur de Performance Sources
                </CardTitle>
                <div className="flex gap-4 mt-3">
                    <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-300 text-xs px-2 py-1">
                        {totalLeads} Leads Total
                    </Badge>
                    <Badge variant="outline" className="bg-indigo-500/10 border-indigo-500/20 text-indigo-400 text-xs px-2 py-1">
                        Conversion Moyenne: {avgConversion.toFixed(1)}%
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12 text-slate-500">
                        <Loader2 className="animate-spin mr-2" /> Chargement...
                    </div>
                ) : metrics.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                        Aucune donnée disponible.
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800/50 text-[10px] uppercase tracking-widest text-slate-500">
                                <th className="text-left p-4 font-medium">Source</th>
                                <th className="text-center p-4 font-medium">Leads</th>
                                <th className="text-center p-4 font-medium">Score IA Moy.</th>
                                <th className="text-center p-4 font-medium">Taux Conversion</th>
                                <th className="text-center p-4 font-medium">Tendance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metrics.map((source, idx) => (
                                <tr
                                    key={idx}
                                    className="border-b border-slate-800/30 hover:bg-slate-800/30 transition-colors"
                                >
                                    <td className="p-4">
                                        <span className="font-bold text-sm text-slate-200">{source.source}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="font-mono text-sm text-slate-300">{source.leadsCount}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`font-bold text-sm ${getScoreColor(source.avgScore)}`}>
                                            {source.avgScore}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${getConversionColor(source.conversionRate)} rounded-full`}
                                                    style={{ width: `${Math.min(source.conversionRate * 3, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-slate-300">{source.conversionRate}%</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center">
                                            {getTrendIcon(source.trend)}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </CardContent>
        </Card>
    );
}
