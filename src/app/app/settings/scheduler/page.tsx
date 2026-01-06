'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Clock, Play, Pause, RefreshCcw, CheckCircle2, AlertTriangle,
    ShieldAlert, Terminal, Calendar, History, Zap, Settings2, Lock
} from 'lucide-react';
import { getScheduledJobsAction, runScheduledJobAction, getJobLogsAction } from '@/application/actions/scheduler.actions';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

export default function SchedulerPage() {
    const { activeOrganization, user, hasPermission } = useAuthStore();
    const { toast } = useToast();

    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJob, setSelectedJob] = useState<string | null>(null);
    const [jobLogs, setJobLogs] = useState<any[]>([]);
    const [runningJob, setRunningJob] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Permission check - only super_admin or admin can access
    const canAccess = hasPermission('canEditUsers');

    useEffect(() => {
        loadJobs();
    }, []);

    async function loadJobs() {
        setIsLoading(true);
        const res = await getScheduledJobsAction();
        if (res.success) setJobs(res.jobs);
        setIsLoading(false);
    }

    async function handleRunJob(jobId: string) {
        if (!activeOrganization?.id) return;

        setRunningJob(jobId);
        toast({ title: "⏳ Exécution en cours...", description: "Veuillez patienter." });

        const res = await runScheduledJobAction(jobId, activeOrganization.id);

        if (res.success) {
            toast({ title: "✅ Job terminé", description: res.result?.message || `Résultat: ${JSON.stringify(res.result)}` });
        } else {
            toast({ title: "❌ Erreur", description: res.error, variant: "destructive" });
        }

        setRunningJob(null);
        loadJobs();
    }

    async function handleViewLogs(jobId: string) {
        setSelectedJob(jobId);
        const res = await getJobLogsAction(jobId);
        if (res.success) setJobLogs(res.logs);
    }

    if (!canAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
                <Card className="max-w-md text-center border-none shadow-2xl rounded-3xl p-12">
                    <div className="h-20 w-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Accès Restreint</h2>
                    <p className="text-slate-500">
                        Cette interface est réservée aux administrateurs techniques.
                        Contactez votre responsable système si vous avez besoin d'accéder à cette section.
                    </p>
                </Card>
            </div>
        );
    }

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'Qualité': return 'bg-indigo-100 text-indigo-700';
            case 'Intégrations': return 'bg-purple-100 text-purple-700';
            case 'Sécurité': return 'bg-rose-100 text-rose-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-rose-600 mb-1">
                        <Terminal size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest">Administration Technique</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">Planificateur de Tâches</h1>
                    <p className="text-slate-500 mt-1 max-w-2xl">
                        Gérez les jobs automatisés du système. Exécutez manuellement ou configurez des CRON.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Badge className="bg-emerald-100 text-emerald-700 border-none px-4 py-2 font-bold gap-2">
                        <Zap size={14} /> Système Opérationnel
                    </Badge>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="flex items-center gap-4 p-6 bg-amber-50 border border-amber-200 rounded-2xl">
                <ShieldAlert className="text-amber-600 shrink-0" size={24} />
                <div>
                    <p className="text-amber-900 font-bold">Zone Sensible</p>
                    <p className="text-amber-700 text-sm">Les actions effectuées ici impactent directement la production. Vérifiez les paramètres avant exécution.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Jobs List */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Calendar size={20} className="text-slate-400" /> Jobs Planifiés
                    </h2>

                    {jobs.map((job) => (
                        <Card key={job.id} className={`border-slate-200 overflow-hidden transition-all hover:shadow-md ${selectedJob === job.id ? 'ring-2 ring-indigo-500' : ''}`}>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-black text-slate-900">{job.name}</h3>
                                            <Badge className={`${getCategoryColor(job.category)} border-none text-[10px] font-bold uppercase`}>{job.category}</Badge>
                                        </div>
                                        <p className="text-sm text-slate-500">{job.description}</p>
                                    </div>
                                    <Badge variant="outline" className="font-mono text-xs bg-slate-50 border-slate-200">
                                        <Clock size={10} className="mr-1" /> {job.cronExpression}
                                    </Badge>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <CheckCircle2 size={12} className="text-emerald-500" /> Actif
                                        </span>
                                        {job.lastRun && (
                                            <span>Dernière exécution: {formatDistanceToNow(new Date(job.lastRun), { addSuffix: true, locale: fr })}</span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 gap-1 text-xs"
                                            onClick={() => handleViewLogs(job.id)}
                                        >
                                            <History size={12} /> Logs
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-8 gap-1 bg-indigo-600 hover:bg-indigo-700 text-xs"
                                            onClick={() => handleRunJob(job.id)}
                                            disabled={runningJob === job.id}
                                        >
                                            {runningJob === job.id ? (
                                                <RefreshCcw size={12} className="animate-spin" />
                                            ) : (
                                                <Play size={12} />
                                            )}
                                            Exécuter
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Logs Panel */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <History size={20} className="text-slate-400" /> Historique d'Exécution
                    </h2>

                    <Card className="border-slate-200 bg-slate-900 text-white rounded-2xl overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-300">
                                {selectedJob ? jobs.find(j => j.id === selectedJob)?.name : 'Sélectionnez un job'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3 max-h-[400px] overflow-auto">
                            {!selectedJob ? (
                                <p className="text-slate-500 text-sm italic p-4 text-center">Cliquez sur "Logs" pour voir l'historique.</p>
                            ) : jobLogs.length === 0 ? (
                                <p className="text-slate-500 text-sm italic p-4 text-center">Aucun historique disponible.</p>
                            ) : jobLogs.map((log) => (
                                <div key={log.id} className="p-3 bg-slate-800 rounded-xl text-xs space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="font-mono text-slate-400">{format(new Date(log.timestamp), 'dd/MM HH:mm:ss')}</span>
                                        {log.status === 'SUCCESS' ? (
                                            <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[9px]">OK</Badge>
                                        ) : (
                                            <Badge className="bg-rose-500/20 text-rose-400 border-none text-[9px]">ERREUR</Badge>
                                        )}
                                    </div>
                                    <p className="text-slate-300">{log.details}</p>
                                    <p className="text-slate-500">Durée: {log.duration}ms</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Quick Info */}
                    <Card className="border-slate-200">
                        <CardContent className="p-6 space-y-4">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                <Settings2 size={16} className="text-slate-400" /> Configuration CRON
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Pour automatiser ces jobs, configurez un endpoint API (<code className="bg-slate-100 px-1 rounded">/api/cron/[jobId]</code>)
                                et utilisez un service comme <strong>Vercel Cron</strong>, <strong>Trigger.dev</strong> ou <strong>GitHub Actions</strong>.
                            </p>
                            <div className="p-3 bg-slate-50 rounded-xl font-mono text-[10px] text-slate-600 overflow-x-auto">
                                curl -X POST https://polyx.app/api/cron/cold_survey \<br />
                                &nbsp;&nbsp;-H "Authorization: Bearer $CRON_SECRET"
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
