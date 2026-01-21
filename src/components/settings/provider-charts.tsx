'use client';

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProviderStats } from '@/application/actions/analytics.providers.actions';

export function ProviderEvolutionChart({ data }: { data: ProviderStats['timeSeriesData'] }) {
    return (
        <Card className="bg-slate-900 border-slate-800 col-span-2">
            <CardHeader>
                <CardTitle className="text-slate-200">Évolution du Volume</CardTitle>
                <CardDescription>Comparatif Leads Reçus vs Qualifiés (14 derniers jours)</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorQual" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                itemStyle={{ color: '#cbd5e1' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="leads"
                                name="Total Reçu"
                                stroke="#6366f1"
                                fillOpacity={1}
                                fill="url(#colorLeads)"
                                strokeWidth={2}
                            />
                            <Area
                                type="monotone"
                                dataKey="qualified"
                                name="Qualifiés"
                                stroke="#22c55e"
                                fillOpacity={1}
                                fill="url(#colorQual)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export function ProviderStatusPie({ data }: { data: ProviderStats['statusDistribution'] }) {
    return (
        <Card className="bg-slate-900 border-slate-800 col-span-1">
            <CardHeader>
                <CardTitle className="text-slate-200">Qualité du Flux</CardTitle>
                <CardDescription>Répartition par statut final</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
