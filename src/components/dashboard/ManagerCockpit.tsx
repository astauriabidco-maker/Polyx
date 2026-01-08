'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Users, Award, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getManagerMetricsAction, getLeadQualityBySourceAction, getScriptPerformanceAction } from '@/application/actions/metrics.actions';

export default function ManagerCockpit({ orgId }: { orgId: string }) {
    const [stats, setStats] = useState<any>(null);
    const [sourceData, setSourceData] = useState<any[]>([]);
    const [scriptData, setScriptData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const [metricsRes, sourceRes, scriptRes] = await Promise.all([
                getManagerMetricsAction(orgId),
                getLeadQualityBySourceAction(orgId),
                getScriptPerformanceAction(orgId)
            ]);

            if (metricsRes.success) setStats(metricsRes);
            if (sourceRes.success) setSourceData(sourceRes.data);
            if (scriptRes.success) setScriptData(scriptRes.data);

            setIsLoading(false);
        }
        load();
    }, [orgId]);

    if (isLoading) return <div className="p-8 text-slate-400">Chargement du cockpit de direction...</div>;

    const { metrics, teamPerformance } = stats;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <header>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pilotage Global</h2>
                <p className="text-slate-500">Supervision de l'activité commerciale et flux entrants.</p>
            </header>

            {/* KPI Global Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard
                    label="Chiffre d'Affaires"
                    value={`${metrics.revenue.toLocaleString('fr-FR')} €`}
                    icon={<DollarSign size={20} className="text-white" />}
                    color="bg-slate-900"
                    trend="+12% vs N-1"
                />
                <KPICard
                    label="Taux de Signature"
                    value={`${metrics.conversionRate}%`}
                    icon={<Award size={20} className="text-white" />}
                    color="bg-indigo-600"
                    trend="Stable"
                />
                <KPICard
                    label="Total Leads"
                    value={metrics.totalLeads}
                    icon={<Users size={20} className="text-white" />}
                    color="bg-blue-500"
                    trend="+5 nouveaux"
                />
                <KPICard
                    label="Nouveaux Leads"
                    value={metrics.leadsNew}
                    icon={<Zap size={20} className="text-white" />}
                    color="bg-amber-500"
                    trend="À traiter"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Team Leaderboard */}
                <Card className="col-span-2 border-slate-200 shadow-sm">
                    <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
                        <CardTitle>Performance Équipe</CardTitle>
                        <Button variant="outline" size="sm">Voir Détails</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-xs text-slate-500 uppercase font-bold tracking-wider border-b border-slate-100">
                                    <th className="px-6 py-3">Commercial</th>
                                    <th className="px-6 py-3 text-right">Ventes</th>
                                    <th className="px-6 py-3 text-right">CA Généré</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {teamPerformance.map((member: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-bold text-slate-700">{member.name}</td>
                                        <td className="px-6 py-4 text-right">{member.sales}</td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-600">{member.revenue.toLocaleString()} €</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Script Performance */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="border-b border-slate-100">
                        <CardTitle>Top Scripts</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {scriptData.map((script: any, i: number) => (
                            <div key={i} className="p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                <p className="font-bold text-slate-700 text-sm">{script.name}</p>
                                <div className="flex justify-between items-end mt-1">
                                    <span className="text-xs text-slate-400">{script.attempts} essais</span>
                                    <span className={`text-sm font-black ${script.rate > 20 ? 'text-green-600' : 'text-amber-600'}`}>
                                        {script.rate}% Conv.
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                    <div className={`h-full rounded-full ${script.rate > 20 ? 'bg-green-500' : 'bg-amber-400'}`} style={{ width: `${script.rate}%` }} />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Source Quality Chart */}
            <div className="grid grid-cols-1">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="border-b border-slate-100">
                        <CardTitle>Qualité des Leads par Source</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sourceData}>
                                <XAxis dataKey="source" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%" />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f1f5f9' }}
                                />
                                <Bar dataKey="rate" radius={[4, 4, 0, 0]} name="Taux de Conv.">
                                    {sourceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.rate > 10 ? '#4f46e5' : '#94a3b8'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function KPICard({ label, value, icon, color, trend }: { label: string, value: string | number, icon: any, color: string, trend: string }) {
    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${color} shadow-lg shadow-indigo-100`}>
                        {icon}
                    </div>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{trend}</span>
                </div>
                <div>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}
