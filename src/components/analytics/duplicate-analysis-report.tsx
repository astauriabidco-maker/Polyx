'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Copy, TrendingDown } from 'lucide-react';

interface DuplicateMetrics {
    partnerName: string;
    totalLeads: number;
    duplicatesCount: number;
    duplicateRate: number; // Percentage
}

// Mock Data - In production, this would come from a server action
const mockDuplicateMetrics: DuplicateMetrics[] = [
    { partnerName: 'LeadGen Pro', totalLeads: 312, duplicatesCount: 47, duplicateRate: 15.1 },
    { partnerName: 'DataFrance', totalLeads: 189, duplicatesCount: 12, duplicateRate: 6.3 },
    { partnerName: 'FormationLeads', totalLeads: 245, duplicatesCount: 8, duplicateRate: 3.3 },
    { partnerName: 'CPF Direct', totalLeads: 156, duplicatesCount: 41, duplicateRate: 26.3 },
    { partnerName: 'WebConversion', totalLeads: 98, duplicatesCount: 2, duplicateRate: 2.0 },
];

function getRiskLevel(rate: number): { label: string; color: string; bgColor: string } {
    if (rate >= 20) return { label: 'CRITIQUE', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' };
    if (rate >= 10) return { label: 'ÉLEVÉ', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20' };
    if (rate >= 5) return { label: 'MODÉRÉ', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20' };
    return { label: 'FAIBLE', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' };
}

export function DuplicateAnalysisReport() {
    const totalDuplicates = mockDuplicateMetrics.reduce((acc, p) => acc + p.duplicatesCount, 0);
    const avgDuplicateRate = mockDuplicateMetrics.reduce((acc, p) => acc + p.duplicateRate, 0) / mockDuplicateMetrics.length;
    const worstOffender = mockDuplicateMetrics.reduce((prev, curr) => prev.duplicateRate > curr.duplicateRate ? prev : curr);

    return (
        <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="border-b border-slate-800/50 pb-4">
                <CardTitle className="text-sm uppercase tracking-widest text-amber-400 font-black flex items-center gap-2">
                    <Copy size={18} /> Analyse des Doublons par Partenaire
                </CardTitle>
                <div className="flex gap-4 mt-3 flex-wrap">
                    <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-300 text-xs px-2 py-1">
                        {totalDuplicates} Doublons Total
                    </Badge>
                    <Badge variant="outline" className="bg-amber-500/10 border-amber-500/20 text-amber-400 text-xs px-2 py-1">
                        Taux Moyen: {avgDuplicateRate.toFixed(1)}%
                    </Badge>
                    <Badge variant="outline" className="bg-red-500/10 border-red-500/20 text-red-400 text-xs px-2 py-1 flex items-center gap-1">
                        <AlertTriangle size={10} /> Pire: {worstOffender.partnerName} ({worstOffender.duplicateRate.toFixed(1)}%)
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-800/50 text-[10px] uppercase tracking-widest text-slate-500">
                            <th className="text-left p-4 font-medium">Partenaire</th>
                            <th className="text-center p-4 font-medium">Leads Envoyés</th>
                            <th className="text-center p-4 font-medium">Doublons</th>
                            <th className="text-center p-4 font-medium">Taux</th>
                            <th className="text-center p-4 font-medium">Niveau de Risque</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockDuplicateMetrics.sort((a, b) => b.duplicateRate - a.duplicateRate).map((partner, idx) => {
                            const risk = getRiskLevel(partner.duplicateRate);
                            return (
                                <tr
                                    key={idx}
                                    className="border-b border-slate-800/30 hover:bg-slate-800/30 transition-colors"
                                >
                                    <td className="p-4">
                                        <span className="font-bold text-sm text-slate-200">{partner.partnerName}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="font-mono text-sm text-slate-300">{partner.totalLeads}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="font-mono text-sm text-slate-400">{partner.duplicatesCount}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${partner.duplicateRate >= 20 ? 'bg-red-500' : partner.duplicateRate >= 10 ? 'bg-amber-500' : 'bg-emerald-500'} rounded-full`}
                                                    style={{ width: `${Math.min(partner.duplicateRate * 3, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-slate-300">{partner.duplicateRate.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <Badge variant="outline" className={`text-[9px] font-black ${risk.bgColor} ${risk.color}`}>
                                            {risk.label}
                                        </Badge>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}
