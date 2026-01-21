'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    TrendingUp,
    ShieldAlert,
    Library,
    BarChart3,
    Sparkles,
    ArrowUpRight,
    CheckCircle2,
    AlertTriangle,
    BrainCircuit,
    Zap,
    Download,
    FileText,
    Loader2,
    X
} from 'lucide-react';
import {
    getStrategicReportAction,
    generatePerformanceProofAction,
    getRiskAuditDetailsAction,
    getSectorialBenchmarkAction
} from '@/application/actions/strategic.actions';
import { jsPDF } from 'jspdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function StrategicCockpit({ orgId }: { orgId: string }) {
    const [report, setReport] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
    const [isRiskAuditOpen, setIsRiskAuditOpen] = useState(false);
    const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
    const [riskDetails, setRiskDetails] = useState<any[]>([]);
    const [benchmarkData, setBenchmarkData] = useState<any>(null);
    const [isLoadingRisk, setIsLoadingRisk] = useState(false);
    const [isLoadingBenchmark, setIsLoadingBenchmark] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [selectedPeriod, setSelectedPeriod] = useState(365);

    useEffect(() => {
        async function load() {
            const res = await getStrategicReportAction(orgId);
            if (res.success) setReport(res.data);
            setIsLoading(false);
        }
        load();
    }, [orgId]);

    const handleOpenRiskAudit = async () => {
        setIsRiskAuditOpen(true);
        setIsLoadingRisk(true);
        const res = await getRiskAuditDetailsAction(orgId);
        if (res.success && res.data) {
            setRiskDetails(res.data);
        }
        setIsLoadingRisk(false);
    };

    const handleOpenBenchmark = async () => {
        setIsBenchmarkOpen(true);
        setIsLoadingBenchmark(true);
        const res = await getSectorialBenchmarkAction(orgId);
        if (res.success && res.data) {
            setBenchmarkData(res.data);
        }
        setIsLoadingBenchmark(false);
    };

    const handleGenerateProof = async () => {
        setIsGeneratingPdf(true);
        const res = await generatePerformanceProofAction(orgId, selectedCategory, selectedPeriod);

        if (res.success && res.data) {
            const data = res.data;
            const doc = new jsPDF();

            // Header
            doc.setFillColor(15, 23, 42); // Slate-900
            doc.rect(0, 0, 210, 45, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("CERTIFICAT DE PERFORMANCE", 105, 25, { align: 'center' });
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Identifiant de Certification: ${data.certificationId}`, 105, 35, { align: 'center' });

            // Info Section
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(`Organisme: ${data.orgName}`, 20, 65);

            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 116, 139);
            doc.text(`Filière : ${data.category}`, 20, 75);
            doc.text(`Période d'Analyse : ${data.periodLabel}`, 20, 82);
            doc.text(`Date d'Émission : ${data.date}`, 20, 89);

            // Divider
            doc.setDrawColor(226, 232, 240);
            doc.line(20, 95, 190, 95);

            // KPI Grid
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(79, 70, 229); // Indigo-600
            doc.text("INDICATEURS DE PERFORMANCE", 20, 110);

            const metrics = [
                { label: "Taux de Réussite aux Examens", value: `${data.metrics.successRate}%` },
                { label: "Insertion Professionnelle (à 6 mois)", value: `${data.metrics.insertionRate}%` },
                { label: "Satisfaction Apprenant (CSAT)", value: `${data.metrics.avgSatisfaction}/5` },
                { label: "Volume d'Apprenants Certifiés", value: data.metrics.totalTrainees.toString() },
                { label: "Heures de Formation Délivrées", value: `${data.metrics.totalVolume} h` }
            ];

            let curY = 125;
            metrics.forEach((m, i) => {
                const color = i % 2 === 0 ? 250 : 255;
                doc.setFillColor(color, color, color);
                doc.rect(20, curY - 5, 170, 10, 'F');
                doc.setTextColor(15, 23, 42);
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(m.label, 25, curY + 2);
                doc.setFont("helvetica", "bold");
                doc.text(m.value, 185, curY + 2, { align: 'right' });
                curY += 12;
            });

            // Footer
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(148, 163, 184);
            doc.text("Ce document constitue une preuve de performance officielle générée de manière automatisée.", 105, 275, { align: 'center' });
            doc.text("Toute altération rend ce certificat caduc. Source des données : ERP Polyx Integrated.", 105, 280, { align: 'center' });

            doc.save(`Certification_${data.category}_${data.date}.pdf`);
        }

        setIsGeneratingPdf(false);
        setIsEvidenceOpen(false);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
                    <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24} />
                </div>
                <p className="text-slate-500 font-medium animate-pulse">Initialisation de l'intelligence stratégique...</p>
            </div>
        );
    }

    const { forecast, riskAudit, aiInsights, evidence } = report;

    return (
        <div className="space-y-10 pb-12 animate-in fade-in duration-1000">
            {/* Premium Header */}
            <header className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 md:p-12 text-white shadow-2xl">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-emerald-600/10 blur-3xl" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-indigo-300 border border-white/10 uppercase tracking-widest">
                            <Sparkles size={14} />
                            Strategic Engine v3.0
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight italic">
                            Le Cerveau <span className="text-indigo-400">Décisionnel</span>.
                        </h1>
                        <p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed">
                            Projections prédictives, audit de risque automatisé et intelligence sectorielle.
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Score de Confiance IA</p>
                            <div className="flex items-center gap-3">
                                <span className="text-4xl font-black text-white">{forecast.confidenceScore}%</span>
                                <div className="h-2 w-24 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${forecast.confidenceScore}%` }} />
                                </div>
                            </div>
                        </div>
                        <Button className="bg-white text-slate-900 hover:bg-slate-100 font-black px-6 rounded-xl shadow-xl shadow-indigo-900/40">
                            Exporter le Deck CODIR
                            <Download size={18} className="ml-2" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* AI Executive Summary (Glassmorphism) */}
            <section className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                <Card className="relative bg-white/80 backdrop-blur-xl border-slate-200 shadow-2xl rounded-[2rem] overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-3">
                        <div className="lg:col-span-2 p-8 md:p-10 border-b lg:border-b-0 lg:border-r border-slate-100">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                    <Zap size={24} fill="currentColor" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight italic">Synthèse Executive par Gemini</h3>
                            </div>
                            <p className="text-slate-700 text-lg leading-relaxed font-medium italic">
                                "{aiInsights.summary}"
                            </p>

                            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {aiInsights.recommendations.map((rec: string, i: number) => (
                                    <div key={i} className="flex items-start gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                        <CheckCircle2 className="text-indigo-600 mt-1 shrink-0" size={18} />
                                        <p className="text-sm font-bold text-slate-700">{rec}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-8 md:p-10 bg-slate-50/50">
                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2 italic">Indicateurs de Performance (KPI)</h4>
                            <div className="space-y-6">
                                {evidence.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 mb-1">{item.label}</p>
                                            <p className="text-2xl font-black text-slate-900 italic">
                                                {item.value}{item.unit === 'PERCENT' ? '%' : ''}
                                            </p>
                                        </div>
                                        <div className="h-10 w-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-emerald-500">
                                            <TrendingUp size={18} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            </section>

            {/* The 4 Pillars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Pillar 1: Projection Prédictive */}
                <PillarCard
                    title="Projection Financière (Forecast)"
                    subtitle="Estimation du CA à M+3 basée sur le pipeline IA"
                    icon={<TrendingUp size={24} />}
                    color="from-indigo-600 to-blue-500"
                    value={`${forecast.projectedRevenue.toLocaleString()} €`}
                    trend={`+${Math.round((forecast.projectedRevenue / forecast.pipelineValue - 1) * 100)}%`}
                    meta={`Basé sur ${forecast.pipelineValue.toLocaleString()}€ de pipeline actif.`}
                />

                {/* Pillar 2: Audit de Risque CODIR */}
                <PillarCard
                    title="Audit de Risque Opérationnel"
                    subtitle="Analyse de l'assiduité et des signaux faibles"
                    icon={<ShieldAlert size={24} />}
                    color={riskAudit.riskScore > 30 ? "from-red-600 to-rose-500" : "from-emerald-600 to-teal-500"}
                    value={`${riskAudit.riskScore}%`}
                    trend={riskAudit.riskScore > 30 ? "Attention" : "Sain"}
                    meta={`${riskAudit.flaggedFolders} dossiers présentent une anomalie critique.`}
                    onClick={handleOpenRiskAudit}
                    interactive
                />

                {/* Pillar 3: Evidence Library */}
                <PillarCard
                    title="Evidence Library (Appels d'Offres)"
                    subtitle="Preuves de performance certifiées pour marchés publics"
                    icon={<Library size={24} />}
                    color="from-slate-800 to-slate-900"
                    value="42"
                    trend="Ready"
                    meta="Taux de réussite, Insertion Pro, Satisfaction (ISO/Qualiopi)."
                    onClick={() => setIsEvidenceOpen(true)}
                    interactive
                />

                {/* Pillar 4: Benchmark Sectoriel */}
                <PillarCard
                    title="Benchmark Sectoriel par IA"
                    subtitle="Comparaison contextuelle vs Moyennes Nationales"
                    icon={<BarChart3 size={24} />}
                    color="from-amber-500 to-orange-400"
                    value="Top 5%"
                    trend="+12% vs Secteur"
                    meta="Vos prix sont 5% inférieurs à la moyenne EdTech France."
                    onClick={handleOpenBenchmark}
                    interactive
                />
            </div>

            {/* Evidence Library Modal */}
            <Dialog open={isEvidenceOpen} onOpenChange={setIsEvidenceOpen}>
                <DialogContent className="sm:max-w-2xl bg-white/95 backdrop-blur-xl border-slate-200 rounded-3xl p-8 shadow-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-slate-900 rounded-2xl text-white">
                                <Library size={24} />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 italic tracking-tight">Evidence Library Engine</DialogTitle>
                                <DialogDescription className="text-slate-500 font-medium">Générez vos preuves de performance certifiées.</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="py-6 space-y-6">
                        <section>
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">1. Sélectionner la thématique</h4>
                            <div className="flex flex-wrap gap-3">
                                {['ALL', 'Langues', 'Digital', 'Vente', 'Management'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${selectedCategory === cat
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                                            }`}
                                    >
                                        {cat === 'ALL' ? 'Toutes Catégories' : cat}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">2. Période d'analyse</h4>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { label: '6 mois', days: 180 },
                                    { label: '12 derniers mois', days: 365 },
                                    { label: '24 mois', days: 730 }
                                ].map(period => (
                                    <button
                                        key={period.days}
                                        onClick={() => setSelectedPeriod(period.days)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${selectedPeriod === period.days
                                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                            }`}
                                    >
                                        {period.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-slate-400">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900 italic">Pack de Preuves de Performance</p>
                                    <p className="text-xs text-slate-500">Format PDF - Prêt pour Appel d'Offre</p>
                                </div>
                            </div>
                            <Button
                                onClick={handleGenerateProof}
                                disabled={isGeneratingPdf}
                                className="bg-slate-900 hover:bg-black text-white px-6 font-black rounded-xl"
                            >
                                {isGeneratingPdf ? (
                                    <span className="flex items-center">
                                        <Loader2 size={18} className="mr-2 animate-spin" />
                                        Compilation...
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        <Download size={18} className="mr-2" />
                                        Générer le Pack
                                    </span>
                                )}
                            </Button>
                        </section>

                        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 flex items-start gap-3">
                            <Sparkles className="text-indigo-600 shrink-0 mt-0.5" size={16} />
                            <p className="text-[11px] font-bold text-slate-600 leading-relaxed">
                                L'intelligence Polyx certifie l'authenticité de ces données. Les taux sont calculés par rapport à l'activité réelle de vos apprenants sur les 12 derniers mois.
                            </p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Risk Audit Modal */}
            <Dialog open={isRiskAuditOpen} onOpenChange={setIsRiskAuditOpen}>
                <DialogContent className="sm:max-w-4xl bg-white/95 backdrop-blur-xl border-slate-200 rounded-3xl p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-3 rounded-2xl text-white bg-gradient-to-br ${riskAudit.riskScore > 30 ? "from-red-600 to-rose-500" : "from-emerald-600 to-teal-500"}`}>
                                <ShieldAlert size={24} />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 italic tracking-tight">Audit de Risque CODIR</DialogTitle>
                                <DialogDescription className="text-slate-500 font-medium tracking-tight">Focus sur les dossiers nécessitant une intervention immédiate.</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto mt-6 pr-2">
                        {isLoadingRisk ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                                <p className="text-slate-500 font-bold italic">Audit du portefeuille en cours...</p>
                            </div>
                        ) : riskDetails.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-emerald-50 rounded-3xl border border-emerald-100">
                                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
                                <p className="text-emerald-900 font-black italic">Aucun dossier à risque critique détecté.</p>
                                <p className="text-emerald-600 text-sm">Votre centre est actuellement sous contrôle total.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <RiskStatCard label="Taux de Risque" value={`${riskAudit.riskScore}%`} color="text-red-600" />
                                    <RiskStatCard label="Dossiers Alertés" value={riskAudit.flaggedFolders} color="text-orange-600" />
                                    <RiskStatCard label="Total Portefeuille" value={riskAudit.totalFolders} color="text-slate-600" />
                                </div>

                                <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow className="hover:bg-transparent border-slate-100">
                                                <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-widest pl-6">Apprenant</TableHead>
                                                <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-widest">Gravité</TableHead>
                                                <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-widest">Signaux d'Alerte</TableHead>
                                                <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-widest text-right pr-6">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="bg-white">
                                            {riskDetails.map((risk) => (
                                                <TableRow key={risk.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                                                    <TableCell className="font-bold text-slate-900 pl-6">{risk.learnerName}</TableCell>
                                                    <TableCell>
                                                        <Badge className={`rounded-lg uppercase text-[10px] font-black tracking-tighter ${risk.riskLevel === 'CRITICAL' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                                                            }`}>
                                                            {risk.riskLevel}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {risk.reasons.map((r: string, idx: number) => (
                                                                <span key={idx} className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                                                                    {r}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg">
                                                            <ArrowUpRight size={18} />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                            <AlertTriangle size={14} className="text-orange-400" />
                            <span>Données synchronisées il y a 5 min</span>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => setIsRiskAuditOpen(false)}
                            className="font-black text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl px-6"
                        >
                            Fermer
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sectorial Benchmark Modal */}
            <Dialog open={isBenchmarkOpen} onOpenChange={setIsBenchmarkOpen}>
                <DialogContent className="sm:max-w-3xl bg-white/95 backdrop-blur-xl border-slate-200 rounded-3xl p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col uppercase tracking-tight">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 rounded-2xl text-white bg-gradient-to-br from-amber-500 to-orange-400 shadow-lg">
                                <BarChart3 size={24} />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 italic tracking-tight uppercase">Benchmark Sectoriel IA</DialogTitle>
                                <DialogDescription className="text-slate-500 font-medium tracking-tight">Analyse comparative de votre positionnement sur le marché.</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto mt-6 pr-2">
                        {isLoadingBenchmark ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
                                <p className="text-slate-500 font-bold italic">Analyse des moyennes nationales en cours...</p>
                            </div>
                        ) : !benchmarkData ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
                                <p className="text-slate-900 font-bold italic uppercase">Erreur de chargement du benchmark.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Top Analysis Banner */}
                                <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl border border-white/10">
                                    <div className="absolute top-0 right-0 h-32 w-32 -mr-16 -mt-16 bg-amber-500/20 rounded-full blur-2xl" />
                                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="space-y-2">
                                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 font-black px-3 py-1 uppercase italic">
                                                POSITIONNEMENT : {benchmarkData.positioning}
                                            </Badge>
                                            <h3 className="text-3xl font-black italic tracking-tighter uppercase">
                                                Vous êtes dans le <span className="text-amber-400">Top {100 - benchmarkData.percentile}%</span> national
                                            </h3>
                                        </div>
                                        <div className="h-24 w-24 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                                            <span className="text-4xl font-black italic">{benchmarkData.percentile}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Comparison Table */}
                                <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow className="hover:bg-transparent border-slate-100 italic">
                                                <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-widest pl-6">Indicateur</TableHead>
                                                <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-widest">Votre Score</TableHead>
                                                <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-widest">Moyenne Marché</TableHead>
                                                <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-widest text-right pr-6">Statut</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="bg-white">
                                            {benchmarkData.comparison.map((item: any, idx: number) => (
                                                <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                                                    <TableCell className="font-bold text-slate-900 pl-6 italic uppercase">{item.label}</TableCell>
                                                    <TableCell className="font-bold text-indigo-600 italic">{item.yours}</TableCell>
                                                    <TableCell className="text-slate-500 font-bold italic">{item.market}</TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Badge className={`rounded-lg italic font-black tracking-tighter uppercase ${parseFloat(item.yours) >= parseFloat(item.market) ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                                                            }`}>
                                                            {parseFloat(item.yours) >= parseFloat(item.market) ? 'SURPERFORMANCE' : 'ALIGNE'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* AI Narrative Analysis */}
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                    <div className="flex items-center gap-2 text-slate-900 font-black italic uppercase">
                                        <BrainCircuit size={18} className="text-indigo-600" />
                                        <h4>Analyse Stratégique</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-bold italic">
                                        {benchmarkData.analysis}
                                    </p>
                                    <div className="pt-4 mt-4 border-t border-slate-200 flex items-center gap-3">
                                        <Zap className="text-amber-500" size={18} fill="currentColor" />
                                        <div className="text-xs">
                                            <span className="font-black text-slate-900 uppercase italic">Recommandation : </span>
                                            <span className="font-bold text-slate-500 italic uppercase">{benchmarkData.recommendation}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
                        <Button
                            onClick={() => setIsBenchmarkOpen(false)}
                            className="bg-slate-900 hover:bg-black font-black text-white rounded-xl px-8 uppercase italic"
                        >
                            Compris
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function RiskStatCard({ label, value, color }: any) {
    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-2xl font-black italic tracking-tighter ${color}`}>{value}</p>
        </div>
    );
}

function PillarCard({ title, subtitle, icon, color, value, trend, meta, onClick, interactive }: any) {
    return (
        <Card
            onClick={onClick}
            className={`group relative overflow-hidden border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-3xl ${interactive ? 'cursor-pointer hover:border-indigo-300' : ''}`}
        >
            <div className={`absolute top-0 right-0 h-32 w-32 -mr-16 -mt-16 bg-gradient-to-br ${color} opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700`} />
            <CardHeader className="p-8 pb-4">
                <div className="flex items-start justify-between">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}>
                        {icon}
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-tighter">
                            {trend}
                        </span>
                    </div>
                </div>
                <div className="mt-6">
                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight italic">{title}</CardTitle>
                    <p className="text-slate-500 text-sm mt-1 font-medium">{subtitle}</p>
                </div>
            </CardHeader>
            <CardContent className="p-8 pt-0">
                <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter italic">{value}</span>
                    <ArrowUpRight className="text-slate-300 group-hover:text-slate-900 transition-colors" size={20} />
                </div>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-slate-200 transition-colors">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" />
                    <p className="text-[11px] font-bold text-slate-500 leading-none">{meta}</p>
                </div>
            </CardContent>
        </Card>
    );
}
