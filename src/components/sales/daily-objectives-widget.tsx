'use client';

import React, { useEffect, useState } from 'react';
import { getDailyUserPerformanceAction } from '@/application/actions/lead.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, CheckCircle2, Clock, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface DailyStats {
    callsCount: number;
    callsDuration: number;
    appointmentsCount: number;
}

const GOALS = {
    CALLS: 50,
    RDV: 2,
    DURATION_MINUTES: 120 // 2 hours
};

export function DailyObjectivesWidget({ userId }: { userId: string }) {
    const [stats, setStats] = useState<DailyStats>({ callsCount: 0, callsDuration: 0, appointmentsCount: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            loadStats();
        }
    }, [userId]);

    const loadStats = async () => {
        setIsLoading(true);
        const res = await getDailyUserPerformanceAction(userId);
        if (res.success && res.stats) {
            setStats(res.stats);
        }
        setIsLoading(false);
    };

    // Calculations
    const callsProgress = Math.min(100, (stats.callsCount / GOALS.CALLS) * 100);
    const rdvProgress = Math.min(100, (stats.appointmentsCount / GOALS.RDV) * 100);

    const durationMinutes = Math.floor(stats.callsDuration / 60);
    const durationProgress = Math.min(100, (durationMinutes / GOALS.DURATION_MINUTES) * 100);

    const isAllComplete = callsProgress === 100 && rdvProgress === 100 && durationProgress === 100;

    return (
        <Card className="border-indigo-100 bg-gradient-to-br from-white to-slate-50 shadow-sm relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <Trophy size={100} />
            </div>

            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <Trophy size={16} className="text-amber-500" /> Challenge du Jour
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

                {/* Calls Objective */}
                <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-slate-600">
                            <Phone size={12} strokeWidth={3} /> Appels
                        </span>
                        <span className={stats.callsCount >= GOALS.CALLS ? 'text-emerald-600' : 'text-slate-400'}>
                            {stats.callsCount} / {GOALS.CALLS}
                        </span>
                    </div>
                    <Progress value={callsProgress} className="h-2 bg-slate-100" indicatorClassName={stats.callsCount >= GOALS.CALLS ? 'bg-emerald-500' : 'bg-indigo-500'} />
                </div>

                {/* RDV Objective */}
                <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-slate-600">
                            <CheckCircle2 size={12} strokeWidth={3} /> RDV Fixés
                        </span>
                        <span className={stats.appointmentsCount >= GOALS.RDV ? 'text-emerald-600' : 'text-slate-400'}>
                            {stats.appointmentsCount} / {GOALS.RDV}
                        </span>
                    </div>
                    <Progress value={rdvProgress} className="h-2 bg-slate-100" indicatorClassName={stats.appointmentsCount >= GOALS.RDV ? 'bg-emerald-500' : 'bg-purple-500'} />
                </div>

                {/* Duration Objective */}
                <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-slate-600">
                            <Clock size={12} strokeWidth={3} /> Temps de parole
                        </span>
                        <span className={durationMinutes >= GOALS.DURATION_MINUTES ? 'text-emerald-600' : 'text-slate-400'}>
                            {durationMinutes} / {GOALS.DURATION_MINUTES} min
                        </span>
                    </div>
                    <Progress value={durationProgress} className="h-2 bg-slate-100" indicatorClassName={durationMinutes >= GOALS.DURATION_MINUTES ? 'bg-emerald-500' : 'bg-blue-500'} />
                </div>

                {isAllComplete && (
                    <div className="mt-4 p-2 bg-amber-100 border border-amber-200 rounded-lg text-center animate-bounce">
                        <p className="text-xs font-black text-amber-700">🎉 OBJECTIFS ATTEINTS !</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
