'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, CheckCircle, AlertTriangle, TrendingUp, Activity } from 'lucide-react';

interface PartnerStats {
    totalDelivered: number;
    accepted: number;
    rejected: number;
    quarantined: number;
    avgScore: number;
    lastDelivery: string;
}

// In production, this would fetch from a dedicated API using the partner's token
const mockPartnerStats: PartnerStats = {
    totalDelivered: 312,
    accepted: 265,
    rejected: 12,
    quarantined: 35,
    avgScore: 68,
    lastDelivery: 'Il y a 2 heures'
};

export function PartnerPortalDashboard({ partnerName = 'Partenaire' }: { partnerName?: string }) {
    const acceptRate = ((mockPartnerStats.accepted / mockPartnerStats.totalDelivered) * 100).toFixed(1);
    const rejectRate = ((mockPartnerStats.rejected / mockPartnerStats.totalDelivered) * 100).toFixed(1);
    const quarantineRate = ((mockPartnerStats.quarantined / mockPartnerStats.totalDelivered) * 100).toFixed(1);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                    <Package className="text-indigo-400" />
                    Portail Partenaire : {partnerName}
                </h1>
                <p className="text-slate-500 mt-2">Consultez vos statistiques de livraison en temps réel.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-500 text-xs uppercase tracking-widest">Total Livrés</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-100">{mockPartnerStats.totalDelivered}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-500 text-xs uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle size={10} className="text-emerald-500" /> Acceptés
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-emerald-400">{mockPartnerStats.accepted}</div>
                        <Badge variant="outline" className="mt-1 text-[10px] bg-emerald-500/10 border-emerald-500/20 text-emerald-400">{acceptRate}%</Badge>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-500 text-xs uppercase tracking-widest flex items-center gap-1">
                            <AlertTriangle size={10} className="text-red-500" /> Rejetés
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-red-400">{mockPartnerStats.rejected}</div>
                        <Badge variant="outline" className="mt-1 text-[10px] bg-red-500/10 border-red-500/20 text-red-400">{rejectRate}%</Badge>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-500 text-xs uppercase tracking-widest flex items-center gap-1">
                            <Activity size={10} className="text-amber-500" /> En Quarantaine
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-amber-400">{mockPartnerStats.quarantined}</div>
                        <Badge variant="outline" className="mt-1 text-[10px] bg-amber-500/10 border-amber-500/20 text-amber-400">{quarantineRate}%</Badge>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <TrendingUp size={16} className="text-indigo-400" /> Score Qualité Moyen
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-4">
                            <span className="text-5xl font-black text-indigo-400">{mockPartnerStats.avgScore}</span>
                            <span className="text-slate-500 text-sm pb-2">/ 100</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                            Ce score reflète la qualité moyenne des leads livrés, calculée par notre moteur d'IA.
                            Un score élevé (&gt;70) indique des leads à forte probabilité de conversion.
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold">Dernière Activité</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Dernière livraison</span>
                            <span className="text-slate-300 font-mono">{mockPartnerStats.lastDelivery}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Statut API</span>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-none">Actif</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Rate Limit</span>
                            <span className="text-slate-300 font-mono">98/100</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <footer className="mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-600">
                Ce portail est en lecture seule. Pour toute question, contactez votre interlocuteur dédié.
            </footer>
        </div>
    );
}
