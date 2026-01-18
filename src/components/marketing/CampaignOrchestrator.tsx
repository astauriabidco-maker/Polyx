'use client';

import React, { useState, useEffect } from 'react';
import {
    Target, TrendingUp, DollarSign, Users,
    BarChart3, Plus, MoreHorizontal, Filter,
    CheckCircle2, Clock, AlertCircle, Play, Pause, Trash2
} from 'lucide-react';
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { getCampaignsAction, updateCampaignAction } from '@/application/actions/marketing.actions';
import { useAuthStore } from '@/application/store/auth-store';
import { toast } from '@/components/ui/use-toast';

export function CampaignOrchestrator() {
    const { activeOrganization } = useAuthStore();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasHydrated, setHasHydrated] = useState(false);

    useEffect(() => {
        setHasHydrated(true);
        console.log("[CampaignOrchestrator] Mounted, activeOrg:", activeOrganization?.id);
    }, []);

    useEffect(() => {
        if (hasHydrated && activeOrganization) {
            console.log("[CampaignOrchestrator] Org changed, loading campaigns...");
            loadCampaigns();
        }
    }, [activeOrganization, hasHydrated]);

    const loadCampaigns = async () => {
        if (!activeOrganization?.id) return;
        try {
            setLoading(true);
            console.log("Loading campaigns for org:", activeOrganization.id);
            const res = await getCampaignsAction(activeOrganization.id);
            if (res.success) {
                setCampaigns(res.campaigns || []);
            } else {
                toast({
                    title: "Erreur de chargement",
                    description: res.error || "Une erreur est survenue lors de la récupération des campagnes.",
                    variant: "destructive"
                });
            }
        } catch (err: any) {
            console.error("Critical Load Error:", err);
            toast({
                title: "Erreur critique",
                description: "Impossible de contacter le serveur.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (campaign: any) => {
        const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        const res = await updateCampaignAction(campaign.id, { status: newStatus });
        if (res.success) {
            toast({ title: "Campagne mise à jour", description: `Statut : ${newStatus}` });
            loadCampaigns();
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE': return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Actif</Badge>;
            case 'PAUSED': return <Badge className="bg-amber-50 text-amber-700 border-amber-200">En pause</Badge>;
            case 'COMPLETED': return <Badge className="bg-slate-50 text-slate-700 border-slate-200">Terminé</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const chartData = campaigns.slice(0, 5).map(c => ({
        name: c.name,
        roas: c.roas,
        conv: c.conversionsCount
    }));

    // Stats global
    const totalSpent = campaigns.reduce((acc, c) => acc + c.spent, 0);
    const totalRevenue = campaigns.reduce((acc, c) => acc + c.estimatedRevenue, 0);
    const globalRoas = totalSpent > 0 ? (totalRevenue / totalSpent).toFixed(2) : '0';

    if (!hasHydrated || !activeOrganization) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-slate-500 text-sm font-medium">Initialisation de l'espace de travail...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Orchestration de Campagnes</h1>
                    <p className="text-slate-500 text-sm">Précision Marketing & Suivi de Rentabilité (ROAS)</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Filter size={16} /> Filtres
                    </Button>
                    <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all">
                        <Plus size={16} /> Nouvelle Campagne
                    </Button>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200/60 shadow-sm overflow-hidden group hover:border-indigo-200 transition-all">
                    <div className="h-1 bg-indigo-500 w-full" />
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ROAS Global</span>
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                <TrendingUp size={16} />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900">{globalRoas}x</div>
                        <p className="text-[10px] text-emerald-600 font-bold mt-1">+12% vs mois dernier</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/60 shadow-sm overflow-hidden group hover:border-emerald-200 transition-all">
                    <div className="h-1 bg-emerald-500 w-full" />
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Budget Consommé</span>
                            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                                <DollarSign size={16} />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900">{totalSpent.toLocaleString()}€</div>
                        <p className="text-[10px] text-slate-400 mt-1">Sur tous les canaux actifs</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/60 shadow-sm overflow-hidden group hover:border-blue-200 transition-all">
                    <div className="h-1 bg-blue-500 w-full" />
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conversion (Ventes)</span>
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                                <CheckCircle2 size={16} />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900">{campaigns.reduce((acc, c) => acc + c.conversionsCount, 0)}</div>
                        <p className="text-[10px] text-blue-600 font-bold mt-1">Tx moyen: 14.5%</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/60 shadow-sm overflow-hidden group hover:border-purple-200 transition-all">
                    <div className="h-1 bg-purple-500 w-full" />
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Revenue</span>
                            <div className="p-2 bg-purple-50 rounded-lg text-purple-600 group-hover:bg-purple-100 transition-colors">
                                <BarChart3 size={16} />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900">{totalRevenue.toLocaleString()}€</div>
                        <p className="text-[10px] text-purple-600 font-bold mt-1">Calculé en temps réel</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-slate-200/60">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <TrendingUp size={16} className="text-indigo-600" />
                            Performances ROAS par Campagne
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        cursor={{ fill: '#F8FAFC' }}
                                    />
                                    <Bar dataKey="roas" radius={[4, 4, 0, 0]} barSize={40}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.roas >= 4 ? '#4F46E5' : entry.roas >= 2 ? '#6366F1' : '#94A3B8'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/60 bg-gradient-to-br from-indigo-900 to-indigo-950 text-white">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-indigo-200">Insights Marketing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-white/10 p-3 rounded-lg border border-white/10 backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <AlertCircle size={16} className="text-amber-400" />
                                <span className="text-xs font-bold uppercase tracking-tight text-amber-200">Alerte Sous-Performance</span>
                            </div>
                            <p className="text-xs text-indigo-100 leading-relaxed">
                                La campagne "Meta Ads FR" a un ROAS de 1.2x, inférieur à votre objectif (2.0x). Prévoyez une réallocation du budget.
                            </p>
                        </div>

                        <div className="bg-white/10 p-3 rounded-lg border border-white/10 backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <CheckCircle2 size={16} className="text-emerald-400" />
                                <span className="text-xs font-bold uppercase tracking-tight text-emerald-200">Top Performer</span>
                            </div>
                            <p className="text-xs text-indigo-100 leading-relaxed">
                                Le canal "Partenaire FormPro" génère le plus gros panier moyen (1,850€). Augmentez le budget de 20%.
                            </p>
                        </div>

                        <Button className="w-full bg-indigo-500 hover:bg-indigo-400 border-none transition-all shadow-lg text-xs font-bold py-5">
                            Générer Rapport IA pour le CODIR
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Campaigns Table */}
            <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold">Détail des Campagnes</CardTitle>
                </CardHeader>
                <Table>
                    <TableHeader className="bg-slate-50/30">
                        <TableRow>
                            <TableHead className="text-[11px] font-black uppercase text-slate-400">Campagne</TableHead>
                            <TableHead className="text-[11px] font-black uppercase text-slate-400">Statut</TableHead>
                            <TableHead className="text-[11px] font-black uppercase text-slate-400 text-right">Budget</TableHead>
                            <TableHead className="text-[11px] font-black uppercase text-slate-400 text-right">Dépensé</TableHead>
                            <TableHead className="text-[11px] font-black uppercase text-slate-400 text-right">Leads</TableHead>
                            <TableHead className="text-[11px] font-black uppercase text-slate-400 text-right">Conv.</TableHead>
                            <TableHead className="text-[11px] font-black uppercase text-slate-400 text-right text-indigo-600">ROAS</TableHead>
                            <TableHead className="text-[11px] font-black uppercase text-slate-400 text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={8} className="text-center py-10 text-slate-400 text-sm">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    Chargement des données...
                                </div>
                            </TableCell></TableRow>
                        ) : campaigns.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="text-center py-16 text-slate-400 text-sm">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-3 bg-slate-50 rounded-full">
                                        <Filter size={24} className="text-slate-300" />
                                    </div>
                                    <p className="font-medium text-slate-500">Aucune campagne configurée pour cet espace.</p>
                                    <Button variant="outline" size="sm" onClick={() => loadCampaigns()}>
                                        Actualiser
                                    </Button>
                                </div>
                            </TableCell></TableRow>
                        ) : (
                            campaigns.map((c) => (
                                <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.name}</span>
                                            <span className="text-[10px] text-slate-400">{c.type}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                                    <TableCell className="text-right font-medium">{c.budget.toLocaleString()}€</TableCell>
                                    <TableCell className="text-right text-slate-500">{c.spent.toLocaleString()}€</TableCell>
                                    <TableCell className="text-right font-semibold">{c.leadsCount}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-slate-900">{c.conversionsCount}</span>
                                            <span className="text-[10px] text-slate-400">{c.conversionRate}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className={`text-sm font-black ${c.roas >= 3 ? 'text-indigo-600' : 'text-slate-600'}`}>
                                            {c.roas}x
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={() => toggleStatus(c)}>
                                                {c.status === 'ACTIVE' ? <Pause size={14} /> : <Play size={14} />}
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600">
                                                <MoreHorizontal size={14} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
