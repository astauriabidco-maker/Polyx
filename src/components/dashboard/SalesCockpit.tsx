'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Target, TrendingUp, Calendar, ArrowRight, User } from 'lucide-react';
import { getSalesMetricsAction } from '@/application/actions/metrics.actions';
import { getVoiceSettingsAction } from '@/application/actions/communication.actions';
import { PhoningSessionModal } from '@/components/sales/phoning-session-modal';

export default function SalesCockpit({ userId, orgId }: { userId: string, orgId: string | string[] }) {
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            // In Nexus mode (array), we might want to check the default org's telephony 
            // or handle it differently. For now, we use the first one if it's an array.
            const primaryOrgId = Array.isArray(orgId) ? orgId[0] : orgId;

            const [metricsRes, voiceRes] = await Promise.all([
                getSalesMetricsAction(userId, orgId),
                getVoiceSettingsAction(primaryOrgId)
            ]);

            if (metricsRes.success) setStats(metricsRes);
            if (voiceRes.success && voiceRes.data) {
                setIsVoiceEnabled((voiceRes.data as any).voiceEnabled || false);
            }
            setIsLoading(false);
        }
        load();
    }, [userId, orgId]);

    if (isLoading) return <div className="p-8 text-slate-400">Chargement de votre cockpit...</div>;

    const { metrics, pipeline, sessionCandidates } = stats;

    const handleStartSession = () => {
        if (!isVoiceEnabled) {
            alert("La téléphonie n'est pas activée pour cette organisation. En mode groupé, la téléphonie utilise votre organisation par défaut.");
            return;
        }
        setIsSessionActive(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mon Espace Vente</h2>
                    <p className="text-slate-500">Objectifs et Tâches du jour.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold border border-indigo-100">
                    <Target size={16} />
                    Objectif Mensuel : {metrics.salesThisMonth} / 20 Signatures
                </div>
            </header>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    label="Appels à faire"
                    value={metrics.callsToDo}
                    icon={<Phone size={20} className="text-white" />}
                    color="bg-rose-500"
                    sub="Priorité Haute"
                />
                <MetricCard
                    label="Opportunités Chaudes"
                    value={metrics.opportunities}
                    icon={<TrendingUp size={20} className="text-white" />}
                    color="bg-amber-500"
                    sub="Pipeline Actif"
                />
                <MetricCard
                    label="Taux de Conversion"
                    value={`${metrics.conversionRate}%`}
                    icon={<Target size={20} className="text-white" />}
                    color="bg-emerald-500"
                    sub="Performance"
                />
            </div>

            {/* Main Action Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* To-Do List */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader className="border-b border-slate-100">
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="text-slate-400" />
                            Actions Prioritaires
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {metrics.callsToDo > 0 ? (
                            <div className="p-8 text-center bg-rose-50/50">
                                <div className="inline-flex items-center justify-center h-16 w-16 bg-rose-100 text-rose-600 rounded-full mb-4 animate-pulse">
                                    <Phone size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Session de Phoning requise</h3>
                                <p className="text-slate-500 mb-6">Vous avez {metrics.callsToDo} prospects à rappeler aujourd'hui.</p>
                                <Button
                                    type="button"
                                    onClick={handleStartSession}
                                    className="relative z-50 cursor-pointer bg-rose-600 hover:bg-rose-700 font-bold px-8 shadow-lg shadow-rose-200"
                                >
                                    Lancer le Call Cockpit
                                </Button>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-slate-400">
                                <p>✅ Aucune tâche en retard. Bravo !</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pipeline Preview */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="border-b border-slate-100">
                        <CardTitle>Pipeline Récent</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        {pipeline.map((lead: any) => (
                            <div key={lead.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors group cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center text-slate-400 font-bold text-xs border border-slate-200">
                                        {lead.firstName?.[0]}{lead.lastName?.[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">{lead.firstName} {lead.lastName}</p>
                                        <p className="text-[10px] text-slate-400">Devis envoyé</p>
                                    </div>
                                </div>
                                <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                            </div>
                        ))}
                        <Button variant="ghost" className="w-full text-xs text-indigo-600 font-bold">
                            Voir tout le pipeline
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Session Modal */}
            {isSessionActive && (
                <PhoningSessionModal
                    leads={sessionCandidates || []}
                    onClose={() => setIsSessionActive(false)}
                />
            )}
        </div>
    );
}

function MetricCard({ label, value, icon, color, sub }: { label: string, value: string | number, icon: any, color: string, sub: string }) {
    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
                    <p className="text-xs font-semibold text-slate-400 mt-2">{sub}</p>
                </div>
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg ${color}`}>
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}
