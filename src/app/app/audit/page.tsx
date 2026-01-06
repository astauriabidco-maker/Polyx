'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Shield, AlertTriangle, CheckCircle2, XCircle, Radar,
    FileSearch, Zap, Lock, RefreshCcw, Eye, Clock,
    FileWarning, Hash, Download, Activity, TrendingUp, BarChart3
} from 'lucide-react';
import {
    getAuditDashboardStatsAction,
    getAuditReportsAction,
    getComplianceAlertsAction,
    runBatchAuditAction,
    resolveAlertAction
} from '@/application/actions/audit.actions';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

export default function AuditWarRoom() {
    const { activeOrganization, user } = useAuthStore();
    const { toast } = useToast();

    const [stats, setStats] = useState<any>(null);
    const [reports, setReports] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuditing, setIsAuditing] = useState(false);

    useEffect(() => {
        if (activeOrganization?.id) {
            loadAllData();
        }
    }, [activeOrganization?.id]);

    async function loadAllData() {
        setIsLoading(true);
        const [statsRes, reportsRes, alertsRes] = await Promise.all([
            getAuditDashboardStatsAction(activeOrganization!.id),
            getAuditReportsAction(activeOrganization!.id),
            getComplianceAlertsAction(activeOrganization!.id)
        ]);

        if (statsRes.success) setStats(statsRes.stats);
        if (reportsRes.success) setReports(reportsRes.reports);
        if (alertsRes.success) setAlerts(alertsRes.alerts);
        setIsLoading(false);
    }

    async function handleRunBatchAudit() {
        setIsAuditing(true);
        toast({ title: "🔍 Audit en cours...", description: "Analyse de tous les dossiers actifs." });

        const res = await runBatchAuditAction(activeOrganization!.id, user?.id);

        if (res.success) {
            toast({
                title: "✅ Audit terminé",
                description: `${res.summary?.totalFolders} dossiers analysés. Score moyen: ${res.summary?.avgScore}%`
            });
            loadAllData();
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
        setIsAuditing(false);
    }

    async function handleResolveAlert(alertId: string) {
        const resolution = prompt("Décrivez l'action corrective apportée:");
        if (!resolution) return;

        const res = await resolveAlertAction(alertId, resolution, user?.id || '');
        if (res.success) {
            toast({ title: "Alerte résolue" });
            loadAllData();
        }
    }

    const getScoreColor = (score: number) => {
        if (score >= 85) return 'text-emerald-400';
        if (score >= 70) return 'text-amber-400';
        if (score >= 50) return 'text-orange-500';
        return 'text-red-500';
    };

    const getSeverityStyle = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'ERROR': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'WARNING': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 bg-red-600 rounded-xl flex items-center justify-center animate-pulse">
                                <Shield size={24} />
                            </div>
                            <span className="text-xs font-mono text-red-400 uppercase tracking-widest">Intelligence Shield v2.0</span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight">AUDIT & CONTRÔLE</h1>
                        <p className="text-slate-400 mt-1 font-mono text-sm">
                            Système de détection d'anomalies • Prêt pour contrôle DRIEETS/CDC
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={handleRunBatchAudit}
                            disabled={isAuditing}
                            className="bg-red-600 hover:bg-red-700 font-mono gap-2 h-12"
                        >
                            {isAuditing ? (
                                <><RefreshCcw size={16} className="animate-spin" /> ANALYSE...</>
                            ) : (
                                <><Radar size={16} /> LANCER AUDIT GLOBAL</>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="flex items-center gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs">
                    <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${stats?.criticalAlerts > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <span className="text-slate-400">STATUS:</span>
                        <span className={stats?.criticalAlerts > 0 ? 'text-red-400' : 'text-emerald-400'}>
                            {stats?.criticalAlerts > 0 ? 'ALERTES CRITIQUES' : 'NOMINAL'}
                        </span>
                    </div>
                    <div className="h-4 w-px bg-slate-700" />
                    <span className="text-slate-500">
                        Dernier audit: {stats?.lastAuditDate ? formatDistanceToNow(new Date(stats.lastAuditDate), { addSuffix: true, locale: fr }) : 'Jamais'}
                    </span>
                    <div className="h-4 w-px bg-slate-700" />
                    <span className="text-slate-500">
                        Dossiers surveillés: <span className="text-white">{stats?.totalFolders || 0}</span>
                    </span>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-mono text-slate-500 uppercase">Score Conformité</p>
                                    <h3 className={`text-4xl font-black mt-1 ${getScoreColor(stats?.avgComplianceScore || 0)}`}>
                                        {stats?.avgComplianceScore || 0}%
                                    </h3>
                                </div>
                                <BarChart3 size={32} className="text-slate-700" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-mono text-slate-500 uppercase">Alertes Ouvertes</p>
                                    <h3 className="text-4xl font-black mt-1 text-amber-400">
                                        {stats?.openAlerts || 0}
                                    </h3>
                                </div>
                                <AlertTriangle size={32} className="text-slate-700" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-mono text-slate-500 uppercase">Alertes Critiques</p>
                                    <h3 className={`text-4xl font-black mt-1 ${stats?.criticalAlerts > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {stats?.criticalAlerts || 0}
                                    </h3>
                                </div>
                                <XCircle size={32} className="text-slate-700" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-mono text-slate-500 uppercase">Rapports Générés</p>
                                    <h3 className="text-4xl font-black mt-1 text-slate-300">
                                        {stats?.totalReports || 0}
                                    </h3>
                                </div>
                                <FileSearch size={32} className="text-slate-700" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="alerts" className="space-y-6">
                    <TabsList className="bg-slate-900 p-1 border border-slate-800">
                        <TabsTrigger value="alerts" className="gap-2 font-mono data-[state=active]:bg-red-600 data-[state=active]:text-white">
                            <AlertTriangle size={14} /> ALERTES ({alerts.filter(a => a.status === 'OPEN').length})
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="gap-2 font-mono data-[state=active]:bg-slate-700">
                            <FileSearch size={14} /> RAPPORTS D'AUDIT
                        </TabsTrigger>
                        <TabsTrigger value="triptyque" className="gap-2 font-mono data-[state=active]:bg-slate-700">
                            <Activity size={14} /> TRIPTYQUE
                        </TabsTrigger>
                    </TabsList>

                    {/* ALERTS TAB */}
                    <TabsContent value="alerts" className="space-y-4">
                        {alerts.filter(a => a.status === 'OPEN').length === 0 ? (
                            <div className="p-12 text-center bg-slate-900 rounded-xl border border-slate-800">
                                <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
                                <p className="font-mono text-emerald-400">AUCUNE ALERTE ACTIVE</p>
                                <p className="text-slate-500 text-sm mt-2">Tous les indicateurs sont au vert.</p>
                            </div>
                        ) : alerts.filter(a => a.status === 'OPEN').map(alert => (
                            <Card key={alert.id} className={`bg-slate-900 border ${alert.severity === 'CRITICAL' ? 'border-red-500/50' : 'border-slate-800'}`}>
                                <CardContent className="p-5">
                                    <div className="flex items-start gap-4">
                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getSeverityStyle(alert.severity)}`}>
                                            {alert.severity === 'CRITICAL' ? <XCircle size={20} /> : <AlertTriangle size={20} />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <Badge className={`${getSeverityStyle(alert.severity)} border font-mono text-[10px]`}>
                                                    {alert.severity}
                                                </Badge>
                                                <span className="text-[10px] font-mono text-slate-500">{alert.type}</span>
                                            </div>
                                            <h4 className="font-bold text-white">{alert.title}</h4>
                                            <p className="text-sm text-slate-400 mt-1">{alert.description}</p>
                                            <div className="flex items-center gap-4 mt-3 text-[10px] font-mono text-slate-500">
                                                <span><Clock size={10} className="inline mr-1" />{format(new Date(alert.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleResolveAlert(alert.id)}
                                            variant="outline"
                                            size="sm"
                                            className="border-slate-700 text-slate-300 hover:bg-slate-800 font-mono text-xs"
                                        >
                                            RÉSOUDRE
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    {/* REPORTS TAB */}
                    <TabsContent value="reports" className="space-y-4">
                        {reports.length === 0 ? (
                            <div className="p-12 text-center bg-slate-900 rounded-xl border border-slate-800">
                                <FileSearch size={48} className="mx-auto text-slate-600 mb-4" />
                                <p className="font-mono text-slate-400">AUCUN RAPPORT</p>
                                <p className="text-slate-500 text-sm mt-2">Lancez un audit pour générer des rapports.</p>
                            </div>
                        ) : reports.map(report => (
                            <Card key={report.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg ${report.status === 'PASSED' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    report.status === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                {report.overallScore}%
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white">{report.title}</h4>
                                                <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-slate-500">
                                                    <span>{format(new Date(report.generatedAt), 'dd/MM/yyyy HH:mm')}</span>
                                                    <span>•</span>
                                                    <Badge variant="outline" className="border-slate-700 text-slate-400">{report.type}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {report.integrityHash && (
                                                <div className="text-right">
                                                    <p className="text-[9px] font-mono text-slate-500 uppercase">Hash SHA-256</p>
                                                    <p className="text-[10px] font-mono text-indigo-400">{report.integrityHash.substring(0, 16)}...</p>
                                                </div>
                                            )}
                                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                                                <Download size={16} />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Triptyque Scores */}
                                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-800">
                                        <div>
                                            <p className="text-[9px] font-mono text-slate-500 uppercase">Contrat</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className={`h-full ${report.contractScore >= 70 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${report.contractScore}%` }} />
                                                </div>
                                                <span className="text-xs font-mono text-slate-300">{report.contractScore}%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-mono text-slate-500 uppercase">Émargement</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className={`h-full ${report.attendanceScore >= 70 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${report.attendanceScore}%` }} />
                                                </div>
                                                <span className="text-xs font-mono text-slate-300">{report.attendanceScore}%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-mono text-slate-500 uppercase">Facture</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className={`h-full ${report.invoiceScore >= 70 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${report.invoiceScore}%` }} />
                                                </div>
                                                <span className="text-xs font-mono text-slate-300">{report.invoiceScore}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    {/* TRIPTYQUE TAB */}
                    <TabsContent value="triptyque" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border-indigo-500/30">
                                <CardContent className="p-8 text-center">
                                    <div className="h-16 w-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <FileSearch size={32} className="text-indigo-400" />
                                    </div>
                                    <h3 className="text-xl font-black text-white">CONTRAT</h3>
                                    <p className="text-indigo-300 text-sm mt-2">Ce qui a été promis</p>
                                    <ul className="text-left text-xs text-slate-400 mt-4 space-y-2">
                                        <li>• Convention de formation</li>
                                        <li>• Programme pédagogique</li>
                                        <li>• Durée contractuelle</li>
                                        <li>• Conditions de réalisation</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-emerald-900/50 to-slate-900 border-emerald-500/30">
                                <CardContent className="p-8 text-center">
                                    <div className="h-16 w-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Lock size={32} className="text-emerald-400" />
                                    </div>
                                    <h3 className="text-xl font-black text-white">ÉMARGEMENT</h3>
                                    <p className="text-emerald-300 text-sm mt-2">Ce qui a été réalisé</p>
                                    <ul className="text-left text-xs text-slate-400 mt-4 space-y-2">
                                        <li>• Feuilles de présence signées</li>
                                        <li>• Horodatage des connexions</li>
                                        <li>• Durée effective passée</li>
                                        <li>• Preuves de participation</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-amber-900/50 to-slate-900 border-amber-500/30">
                                <CardContent className="p-8 text-center">
                                    <div className="h-16 w-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <TrendingUp size={32} className="text-amber-400" />
                                    </div>
                                    <h3 className="text-xl font-black text-white">FACTURE</h3>
                                    <p className="text-amber-300 text-sm mt-2">Ce qui est réclamé</p>
                                    <ul className="text-left text-xs text-slate-400 mt-4 space-y-2">
                                        <li>• Montant facturé</li>
                                        <li>• Déclaration CDC</li>
                                        <li>• Service fait</li>
                                        <li>• Cohérence globale</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="p-6 bg-slate-900 rounded-xl border border-red-500/30">
                            <div className="flex items-start gap-4">
                                <AlertTriangle className="text-red-500 shrink-0" size={24} />
                                <div>
                                    <h4 className="font-bold text-white">Règle d'Or du Contrôle CDC</h4>
                                    <p className="text-slate-400 text-sm mt-2">
                                        Toute asymétrie entre ces trois éléments constitue une <span className="text-red-400 font-bold">Non-Conformité Majeure</span> pouvant entraîner :
                                    </p>
                                    <ul className="text-sm text-slate-400 mt-3 space-y-1">
                                        <li>• Remboursement intégral des fonds CPF perçus</li>
                                        <li>• Déréférencement de l'organisme</li>
                                        <li>• Transmission au procureur en cas de fraude avérée</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Footer */}
                <div className="flex items-center justify-center gap-4 pt-8 border-t border-slate-800 text-[10px] font-mono text-slate-600">
                    <Hash size={12} />
                    <span>Blockchain-Ready Integrity System</span>
                    <span>•</span>
                    <span>Polyx Intelligence Shield</span>
                    <span>•</span>
                    <span>© 2026</span>
                </div>
            </div>
        </div>
    );
}
