'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Calculator, FileSpreadsheet, PieChart, Users, Clock,
    AlertTriangle, CheckCircle2, Download, RefreshCcw, Sparkles,
    Lock, Printer, FileText, ChevronRight
} from 'lucide-react';
import {
    generateBPFReportAction,
    getBPFReportsAction,
    generateBPFSynthesisAction,
    validateBPFReportAction
} from '@/application/actions/bpf.actions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export default function BPFPage() {
    const { activeOrganization, user } = useAuthStore();
    const { toast } = useToast();

    const [reports, setReports] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [currentReport, setCurrentReport] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (activeOrganization?.id) {
            loadReports();
        }
    }, [activeOrganization?.id, selectedYear]);

    async function loadReports() {
        setIsLoading(true);
        const res = await getBPFReportsAction(activeOrganization!.id);
        if (res.success) {
            setReports(res.reports);
            const reportForYear = res.reports.find((r: any) => r.year === selectedYear);
            setCurrentReport(reportForYear || null);
        }
        setIsLoading(false);
    }

    async function handleGenerateBPF() {
        setIsGenerating(true);
        toast({ title: "📊 Calcul du BPF en cours...", description: "Mapping des cadres C, E, F, G..." });

        const res = await generateBPFReportAction(activeOrganization!.id, selectedYear);

        if (res.success) {
            toast({
                title: "✅ BPF Généré",
                description: `Bilan ${selectedYear} calculé avec succès. Risque: ${res.logicChecks?.riskLevel || 'N/A'}`
            });
            setCurrentReport(res.report);
            loadReports();
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
        setIsGenerating(false);
    }

    async function handleAISynthesis() {
        if (!currentReport) return;
        toast({ title: "🤖 Gemini s'active...", description: "Rédaction de la synthèse stratégique." });

        const res = await generateBPFSynthesisAction(currentReport.id);
        if (res.success) {
            toast({ title: "✨ Synthèse prête" });
            loadReports(); // Reload to get synthesis
            setCurrentReport({ ...currentReport, aiSynthesis: res.synthesis });
        }
    }

    async function handleValidate() {
        if (!currentReport) return;
        if (!confirm("Voulez-vous valider définitivement ce BPF ? Cette action est irréversible et génère l'empreinte légale.")) return;

        const res = await validateBPFReportAction(currentReport.id, user?.id || '');
        if (res.success) {
            toast({ title: "🔒 BPF Validé & Verrouillé" });
            loadReports();
            setCurrentReport(res.report);
        }
    }

    const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b'];

    const getRevenueData = () => [
        { name: 'CPF', value: currentReport?.cpfRevenue || 0 },
        { name: 'OPCO', value: currentReport?.opcoRevenue || 0 },
        { name: 'Public', value: currentReport?.publicRevenue || 0 },
        { name: 'Autres', value: currentReport?.otherRevenue || 0 },
    ];

    if (!activeOrganization) return <div className="p-8">Chargement...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                        <FileSpreadsheet size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest">Administration DGEFP</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">Bilan Pédagogique (BPF)</h1>
                    <p className="text-slate-500 mt-1">
                        Moteur de calcul automatique certifié Cerfa N° 10443*16.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="h-10 rounded-md border border-slate-200 px-3 font-bold text-slate-700"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>Exercice {y}</option>)}
                    </select>
                    <Button
                        onClick={handleGenerateBPF}
                        disabled={isGenerating || (currentReport?.status === 'VALIDATED')}
                        className="bg-indigo-600 hover:bg-indigo-700 gap-2 font-bold"
                    >
                        {isGenerating ? <RefreshCcw className="animate-spin" size={16} /> : <Calculator size={16} />}
                        {currentReport ? 'Recalculer' : 'Générer le BPF'}
                    </Button>
                </div>
            </div>

            {!currentReport ? (
                <div className="p-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <FileSpreadsheet size={64} className="mx-auto text-slate-300 mb-6" />
                    <h3 className="text-xl font-bold text-slate-900">Aucun BPF pour {selectedYear}</h3>
                    <p className="text-slate-500 max-w-md mx-auto mt-2 mb-8">
                        Cliquez sur "Générer le BPF" pour lancer l'agrégation automatique de vos données financières et pédagogiques.
                    </p>
                    <Button onClick={handleGenerateBPF} className="bg-indigo-600">Lancer le calcul</Button>
                </div>
            ) : (
                <>
                    {/* Status & Alerts Banner */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2 border-l-4 border-l-indigo-500 shadow-sm">
                            <CardContent className="p-6 flex items-start gap-4">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${currentReport.status === 'VALIDATED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                    {currentReport.status === 'VALIDATED' ? <Lock size={24} /> : <FileSpreadsheet size={24} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-bold text-lg text-slate-900">État du Bilan {selectedYear}</h3>
                                        <Badge className={`${currentReport.status === 'VALIDATED' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                            {currentReport.status === 'VALIDATED' ? 'VALIDÉ & VERROUILLÉ' : 'BROUILLON'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Hash d'intégrité: <span className="font-mono text-xs bg-slate-100 px-1 rounded">{currentReport.integrityHash?.substring(0, 20) || 'Non généré'}...</span>
                                    </p>
                                </div>
                                {currentReport.status !== 'VALIDATED' && (
                                    <Button onClick={handleValidate} variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                                        Valider
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        <Card className={`border-l-4 ${currentReport.riskLevel === 'HIGH' ? 'border-l-red-500 bg-red-50' : currentReport.riskLevel === 'MEDIUM' ? 'border-l-amber-500 bg-amber-50' : 'border-l-emerald-500 bg-emerald-50'}`}>
                            <CardContent className="p-6">
                                <h4 className={`font-bold uppercase text-xs ${currentReport.riskLevel === 'HIGH' ? 'text-red-700' : currentReport.riskLevel === 'MEDIUM' ? 'text-amber-700' : 'text-emerald-700'}`}>
                                    Niveau de Risque Contrôle
                                </h4>
                                <div className="flex items-center gap-2 mt-2">
                                    <AlertTriangle size={24} className={currentReport.riskLevel === 'HIGH' ? 'text-red-600' : currentReport.riskLevel === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'} />
                                    <span className="text-2xl font-black text-slate-900">{currentReport.riskLevel}</span>
                                </div>
                                <p className="text-xs text-slate-600 mt-1">
                                    {currentReport.alerts?.length || 0} anomalie(s) détectée(s)
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Cadres Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* LEFT COLUMN: VISUALS */}
                        <div className="space-y-6">
                            <Card className="overflow-hidden">
                                <CardHeader className="bg-slate-50 pb-4">
                                    <CardTitle className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
                                        <PieChart size={16} /> Répartition Produits (Cadre C)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={getRevenueData()} layout="vertical" margin={{ left: 20 }}>
                                            <XAxis type="number" hide />
                                            <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} />
                                            <Tooltip formatter={(val: any) => `${val} €`} />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                {getRevenueData().map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-900 text-white border-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-indigo-400">
                                        <Sparkles size={20} /> Synthèse IA
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!currentReport.aiSynthesis ? (
                                        <div className="text-center py-8">
                                            <p className="text-slate-400 text-sm mb-4">Générez une analyse stratégique de votre BPF.</p>
                                            <Button onClick={handleAISynthesis} size="sm" className="bg-indigo-600 hover:bg-indigo-700 w-full">
                                                Lancer Gemini
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                                            <div dangerouslySetInnerHTML={{ __html: currentReport.aiSynthesis.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/\n/g, '<br/>') }} />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT COLUMN: CERFA DATA */}
                        <div className="lg:col-span-2 space-y-6">
                            <Tabs defaultValue="cadreC" className="w-full">
                                <TabsList className="w-full justify-start bg-white border border-slate-200 p-0 h-12 rounded-xl overflow-hidden">
                                    <TabsTrigger value="cadreC" className="flex-1 h-full rounded-none data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600">
                                        Cadre C (Finances)
                                    </TabsTrigger>
                                    <TabsTrigger value="cadreE" className="flex-1 h-full rounded-none data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600">
                                        Cadre E (Stagiaires)
                                    </TabsTrigger>
                                    <TabsTrigger value="cadreF" className="flex-1 h-full rounded-none data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600">
                                        Cadre F (Heures)
                                    </TabsTrigger>
                                </TabsList>

                                <div className="mt-6">
                                    <TabsContent value="cadreC">
                                        <Card>
                                            <CardContent className="p-0">
                                                <TableRow label="Total Produits Formation" value={currentReport.totalRevenue} unit="€" isTotal />
                                                <div className="h-px bg-slate-100 my-2" />
                                                <TableRow label="Dont fonds publics (CPF/CDC)" value={currentReport.cpfRevenue} unit="€" />
                                                <TableRow label="Dont OPCO" value={currentReport.opcoRevenue} unit="€" />
                                                <TableRow label="Dont Pôle Emploi / Régions" value={currentReport.publicRevenue} unit="€" />
                                                <TableRow label="Dont Entreprises" value={currentReport.companyRevenue} unit="€" />
                                                <TableRow label="Dont Particuliers" value={currentReport.individualRevenue} unit="€" />
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="cadreE">
                                        <Card>
                                            <CardContent className="p-0">
                                                <TableRow label="Nombre total de stagiaires" value={currentReport.totalTrainees} unit="pers." isTotal />
                                                <div className="h-px bg-slate-100 my-2" />
                                                <TableRow label="Financement CPF" value={currentReport.cpfTrainees} unit="pers." />
                                                <TableRow label="Financement OPCO" value={currentReport.opcoTrainees} unit="pers." />
                                                <TableRow label="Autres financements" value={currentReport.otherTrainees} unit="pers." />
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="cadreF">
                                        <Card>
                                            <CardContent className="p-0">
                                                <TableRow label="Total Heures Stagiaires" value={currentReport.totalHours} unit="h" isTotal />
                                                <div className="h-px bg-slate-100 my-2" />
                                                <TableRow label="Heures CPF" value={currentReport.cpfHours} unit="h" />
                                                <TableRow label="Heures OPCO" value={currentReport.opcoHours} unit="h" />
                                                <TableRow label="Autres Heures" value={currentReport.otherHours} unit="h" />
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                </div>
                            </Tabs>

                            {/* Alerts List */}
                            {currentReport.alerts && currentReport.alerts.length > 0 && (
                                <Card className="border-amber-200 bg-amber-50/50">
                                    <CardHeader>
                                        <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
                                            <AlertTriangle size={16} /> Anomalies Détectées
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {currentReport.alerts.map((alert: any) => (
                                            <div key={alert.id} className="flex gap-3 text-sm p-3 bg-white rounded-lg border border-amber-100 shadow-sm">
                                                <Badge variant="outline" className={`h-fit ${alert.severity === 'CRITICAL' ? 'border-red-500 text-red-500' : 'border-amber-500 text-amber-500'}`}>
                                                    {alert.severity}
                                                </Badge>
                                                <span className="text-slate-700">{alert.message}</span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button variant="outline" className="gap-2">
                                    <Printer size={16} /> Imprimer Note
                                </Button>
                                <Button variant="outline" className="gap-2">
                                    <Download size={16} /> Export Cerfa PDF
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function TableRow({ label, value, unit, isTotal }: { label: string, value: number, unit: string, isTotal?: boolean }) {
    return (
        <div className={`flex justify-between items-center p-4 hover:bg-slate-50 transition-colors ${isTotal ? 'bg-slate-50/80 font-bold text-slate-900' : 'text-slate-600'}`}>
            <span>{label}</span>
            <span className="font-mono">{value.toLocaleString('fr-FR')} {unit}</span>
        </div>
    );
}
