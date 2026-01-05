'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Users, Award, Zap } from 'lucide-react';
import { getManagerMetricsAction } from '@/application/actions/metrics.actions';

export default function ManagerCockpit({ orgId }: { orgId: string }) {
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const res = await getManagerMetricsAction(orgId);
            if (res.success) setStats(res);
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Team Leaderboard */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="border-b border-slate-100">
                        <CardTitle>Performance Équipe</CardTitle>
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

                {/* API Flux Placeholder (Previously in DashboardPage) */}
                <Card className="border-slate-200 border-dashed bg-slate-50/30 flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
                    <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center border border-slate-200 mb-4 shadow-sm">
                        <Zap size={32} className="text-slate-400" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg">Flux API Entrant</h3>
                    <p className="text-slate-500 max-w-xs mb-6">Le widget d'importation des leads API sera intégré ici pour la supervision technique.</p>
                    <Button variant="outline">Voir les flux (Admin)</Button>
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
