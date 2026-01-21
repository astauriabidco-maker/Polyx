'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getAgendaStatsAction } from '@/application/actions/agenda.actions';
import { Loader2, TrendingUp, Users, CalendarCheck, CheckCircle2, Video, Car } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AgendaStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    orgId: string;
}

export function AgendaStatsModal({ isOpen, onClose, orgId }: AgendaStatsModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        if (isOpen && orgId) {
            loadStats();
        }
    }, [isOpen, orgId]);

    async function loadStats() {
        setIsLoading(true);
        const res = await getAgendaStatsAction(orgId);
        if (res.success) {
            setStats(res.data);
        }
        setIsLoading(false);
    }

    if (!stats && isLoading) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <TrendingUp className="text-indigo-600" /> Analytics Agenda
                    </DialogTitle>
                    <DialogDescription>
                        Performance des équipes et volume des rendez-vous à venir.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center p-10">
                        <Loader2 className="animate-spin text-indigo-600" size={40} />
                    </div>
                ) : (
                    <div className="space-y-6 pt-4">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard
                                title="Total Rendez-vous"
                                value={stats?.totalEvents || 0}
                                icon={<CalendarCheck size={20} className="text-white" />}
                                color="bg-indigo-500"
                            />
                            <StatCard
                                title="Visio-Conférence"
                                value={stats?.byType?.find((t: any) => t.type === 'VISIO')?._count || 0}
                                icon={<Video size={20} className="text-white" />}
                                color="bg-blue-500"
                            />
                            <StatCard
                                title="Présentiel"
                                value={stats?.byType?.find((t: any) => t.type === 'PHYSIQUE')?._count || 0}
                                icon={<Car size={20} className="text-white" />}
                                color="bg-emerald-500"
                            />
                        </div>

                        {/* Top Performers */}
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Users className="text-slate-500" size={20} />
                                    Top Performers (Volume)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {stats?.topUsers?.map((user: any, index: number) => (
                                        <div key={user.userId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                                                    #{index + 1}
                                                </div>
                                                <span className="font-bold text-slate-700">{user.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl font-black text-indigo-900">{user.count}</span>
                                                <span className="text-xs text-slate-500 uppercase font-bold">RDV</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!stats?.topUsers || stats.topUsers.length === 0) && (
                                        <p className="text-center text-slate-500 py-4">Aucune donnée disponible.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) {
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{title}</p>
                <p className="text-3xl font-black text-slate-900">{value}</p>
            </div>
        </div>
    );
}
