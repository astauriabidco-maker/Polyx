
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getManagerAgendaStatsAction } from '@/application/actions/agenda.actions';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, AreaChart, Area, PieChart, Pie
} from 'recharts';
import { TrendingUp, Users, Target, Clock, AlertCircle, Loader2, ArrowUpRight } from 'lucide-react';

export default function AgendaManagerDashboard({ orgId, agencyId }: { orgId: string, agencyId?: string }) {
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            const res = await getManagerAgendaStatsAction(orgId, agencyId === 'ALL' ? undefined : agencyId);
            if (res.success) setStats(res.data);
            setIsLoading(false);
        }
        load();
    }, [orgId, agencyId]);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Calcul des indicateurs de performance...</p>
        </div>
    );

    if (!stats) return null;

    const COLORS = ['#4f46e5', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* KPI OVERVIEW */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard
                    title="Volume RDVs (30j)"
                    value={stats.totalEvents}
                    icon={<Clock size={20} />}
                    color="text-indigo-600"
                    trend="+12%"
                />
                <KPICard
                    title="Taux de Conversion"
                    value={`${stats.conversionRate}%`}
                    icon={<Target size={20} />}
                    color="text-emerald-600"
                    trend="+5%"
                />
                <KPICard
                    title="RDVs Transformés"
                    value={stats.convertedCount}
                    icon={<TrendingUp size={20} />}
                    color="text-blue-600"
                />
                <KPICard
                    title="Satisfaction"
                    value="4.8/5"
                    icon={<Users size={20} />}
                    color="text-amber-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* FLOW TREND */}
                <Card className="border-0 shadow-2xl shadow-indigo-100/50 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-xl">
                    <CardHeader className="border-b border-slate-50 p-6">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                            <TrendingUp size={18} className="text-indigo-600" />
                            Flux des Rendez-vous
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.trendData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* TEAM PERFORMANCE */}
                <Card className="border-0 shadow-2xl shadow-indigo-100/50 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-xl">
                    <CardHeader className="border-b border-slate-50 p-6">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                            <Users size={18} className="text-indigo-600" />
                            Top Performance Équipe
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.teamPerformance} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px' }} />
                                <Bar dataKey="conversion" radius={[0, 10, 10, 0]} barSize={20}>
                                    {stats.teamPerformance.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* DAY SATURATION */}
                <Card className="border-0 shadow-2xl shadow-indigo-100/50 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-xl lg:col-span-2">
                    <CardHeader className="border-b border-slate-50 p-6">
                        <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                            <Clock size={18} className="text-indigo-600" />
                            Saturation de l'Agenda par Jour
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 h-[200px]">
                        <div className="flex justify-between items-end h-full gap-4">
                            {stats.daySaturation.map((d: any) => (
                                <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                                    <div className="relative w-full bg-slate-50 rounded-2xl overflow-hidden" style={{ height: '140px' }}>
                                        <div
                                            className="absolute bottom-0 w-full bg-indigo-500 rounded-t-2xl transition-all duration-1000"
                                            style={{ height: `${(d.count / Math.max(...stats.daySaturation.map((x: any) => x.count))) * 100}%` }}
                                        >
                                            <div className="absolute -top-6 w-full text-center text-[10px] font-black text-indigo-600">{d.count}</div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase">{d.day}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* PENDING DEBRIEFINGS - CRITICAL FOR MANAGERS */}
            <PendingDebriefingsList orgId={orgId} agencyId={agencyId} />

        </div>
    );
}

import PendingDebriefingsList from './PendingDebriefingsList';

function KPICard({ title, value, icon, color, trend }: { title: string, value: string | number, icon: React.ReactNode, color: string, trend?: string }) {
    return (
        <Card className="border-0 shadow-xl shadow-indigo-50/50 rounded-3xl p-5 bg-white/80 backdrop-blur-sm">
            <div className="flex justify-between items-start">
                <div className={`p-3 rounded-2xl bg-slate-50 ${color}`}>{icon}</div>
                {trend && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
                        <ArrowUpRight size={12} /> {trend}
                    </div>
                )}
            </div>
            <div className="mt-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
            </div>
        </Card>
    );
}
