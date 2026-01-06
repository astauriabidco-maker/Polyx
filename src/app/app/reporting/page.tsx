'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Radar, ShieldAlert, TrendingUp, Target,
    ArrowUpRight, ArrowDownRight, LineChart, BookOpen,
    Zap, BrainCircuit, RefreshCw, CheckCircle2
} from 'lucide-react';
import { generateStrategicReportAction, getLatestStrategicReportAction } from '@/application/actions/reporting.actions';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ReportingPage() {
    const { activeOrganization } = useAuthStore();
    const { toast } = useToast();
    const [report, setReport] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (activeOrganization?.id) {
            loadReport();
        }
    }, [activeOrganization?.id]);

    async function loadReport() {
        setIsLoading(true);
        const res = await getLatestStrategicReportAction(activeOrganization!.id);
        if (res.success) setReport(res.report);
        setIsLoading(false);
    }

    async function handleGenerate() {
        setIsGenerating(true);
        const period = format(new Date(), 'yyyy-MM');
        const res = await generateStrategicReportAction(activeOrganization!.id, period);

        if (res.success) {
            setReport(res.report);
            toast({ title: "🧠 Analyse Stratégique Terminée", description: "Le cockpit a été mis à jour avec les dernières données." });
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
        setIsGenerating(false);
    }

    if (isLoading) return <div className="p-12 text-center text-slate-500">Chargement du cerveau analytique...</div>;

    return (
        <div className="flex flex-col h-full bg-[#0f172a] text-slate-100 min-h-screen">
            {/* Header / War Room */}
            <div className="bg-[#1e293b] border-b border-slate-700 px-8 py-6 flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                        <BrainCircuit size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                            COCKPIT STRATÉGIQUE <Badge variant="outline" className="border-indigo-500 text-indigo-400">V3.0</Badge>
                        </h1>
                        <p className="text-slate-400 text-sm font-mono mt-1">
                            IA: GEMINI-PRO • MODE: PRÉDICTIF • SESSION: {format(new Date(), 'dd MMM yyyy', { locale: fr }).toUpperCase()}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-white"
                        onClick={loadReport}
                    >
                        <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold border border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
                    >
                        {isGenerating ? (
                            <span className="flex items-center gap-2"><Zap size={16} className="animate-pulse" /> ANALYSE EN COURS...</span>
                        ) : (
                            <span className="flex items-center gap-2"><Zap size={16} /> LANCER L'ANALYSE IA</span>
                        )}
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-6 md:p-8 space-y-8">

                {!report ? (
                    <div className="text-center py-20">
                        <Radar size={64} className="mx-auto text-slate-700 mb-4" />
                        <h3 className="text-xl font-bold text-slate-300">En attente de données</h3>
                        <p className="text-slate-500 mb-6">Lancez une première analyse pour activer le cockpit.</p>
                        <Button onClick={handleGenerate} variant="secondary">Initialiser le Système</Button>
                    </div>
                ) : (
                    <>
                        {/* 1. Predictive Finance Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="bg-[#1e293b] border-slate-700 lg:col-span-2 shadow-lg">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-indigo-300 flex items-center gap-2">
                                            <TrendingUp size={20} /> PROJECTION REVENUS (M+3)
                                        </CardTitle>
                                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-none">
                                            Confiance: {report.confidenceScore}%
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-end gap-2 mb-2">
                                        <span className="text-5xl font-black text-white tracking-tighter">
                                            {report.projectedRevenue.toLocaleString('fr-FR')} €
                                        </span>
                                        <span className="text-emerald-400 font-bold mb-2 flex items-center">
                                            <ArrowUpRight size={20} /> +12% vs N-1
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-sm mb-6">
                                        Basé sur un pipeline de {report.currentPipelineValue.toLocaleString()}€ et un taux de conversion historique de 42%.
                                    </p>

                                    {/* Mock Chart Bar */}
                                    <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex">
                                        <div className="h-full bg-indigo-600 w-[65%]" title="Sécurisé" />
                                        <div className="h-full bg-indigo-400/50 w-[20%]" title="Probable" />
                                        <div className="h-full bg-slate-700 w-[15%]" title="Gap" />
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                                        <span>SÉCURISÉ (65%)</span>
                                        <span>PROBABLE (20%)</span>
                                        <span>À TROUVER (15%)</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* AI Synthesis */}
                            <Card className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border-indigo-500/30 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-50">
                                    <BrainCircuit size={100} className="text-indigo-500/10" />
                                </div>
                                <CardHeader>
                                    <CardTitle className="text-indigo-300 flex items-center gap-2">
                                        <Zap size={20} className="text-yellow-400" /> GEMINI INSIGHTS
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="prose prose-invert prose-sm">
                                    <div className="whitespace-pre-line text-slate-300 font-medium leading-relaxed">
                                        {report.executiveSummary}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* 2. Risk & Ops Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Risks */}
                            <Card className="bg-[#1e293b] border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-rose-400 flex items-center gap-2">
                                        <ShieldAlert size={20} /> AUDIT DE RISQUE
                                    </CardTitle>
                                    <CardDescription className="text-slate-500">Signaux faibles détectés</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {report.risks.map((risk: any) => (
                                        <div key={risk.id} className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg flex items-start gap-3">
                                            <div className="mt-1">
                                                {risk.trend === 'DOWN' ? <ArrowDownRight className="text-rose-500" size={18} /> : <Target className="text-amber-500" size={18} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-200">{risk.label}</h4>
                                                    <Badge className="bg-rose-500 text-white border-none text-[10px]">{risk.severity}</Badge>
                                                </div>
                                                <div className="text-2xl font-mono font-bold text-white my-1">
                                                    {risk.currentValue} <span className="text-xs text-slate-500 font-normal"> / Cible {risk.targetValue}</span>
                                                </div>
                                                <p className="text-xs text-rose-300/80">{risk.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Evidence Library */}
                            <Card className="bg-[#1e293b] border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-emerald-400 flex items-center gap-2">
                                        <BookOpen size={20} /> EVIDENCE LIBRARY
                                    </CardTitle>
                                    <CardDescription className="text-slate-500">Preuves de performance (Appels d'Offres)</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        {report.evidence.map((item: any) => (
                                            <div key={item.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">{item.label}</p>
                                                <div className="text-3xl font-black text-white">
                                                    {item.value}{item.unit === 'PERCENT' ? '%' : ''}
                                                </div>
                                                <div className="mt-2 text-[10px] text-emerald-400 flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> Source: {item.source}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-3 bg-indigo-600/10 border border-indigo-500/20 rounded text-center">
                                        <p className="text-indigo-300 text-sm font-medium">Positionnement Prix: <span className="text-white font-bold">PREMIUM (+15%)</span></p>
                                        <p className="text-xs text-slate-500">vs Moyenne Nationale (Secteur Formation)</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
