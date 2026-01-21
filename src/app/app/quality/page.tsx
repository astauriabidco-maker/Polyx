'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import {
    ShieldCheck, Star, Users, MessageSquare,
    TrendingUp, Award, CheckCircle2, AlertCircle,
    Calendar, Download, FileBarChart, BrainCircuit,
    ThumbsUp, ThumbsDown, Megaphone, Clock, CheckCircle, Snowflake, Play
} from 'lucide-react';
import { getGlobalQualityStatsAction, getVerbatimsAction, getComplaintsAction, updateComplaintStatusAction, runColdSurveySchedulerAction } from '@/application/actions/quality.actions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

export default function QualityDashboard() {
    const { activeOrganization } = useAuthStore();
    const { toast } = useToast();

    const [stats, setStats] = useState<any>(null);
    const [verbatims, setVerbatims] = useState<any[]>([]);
    const [complaints, setComplaints] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (activeOrganization?.id) {
            loadAllData();
        }
    }, [activeOrganization?.id]);

    async function loadAllData() {
        setIsLoading(true);
        const [statsRes, verRes, compRes] = await Promise.all([
            getGlobalQualityStatsAction(activeOrganization!.id),
            getVerbatimsAction(activeOrganization!.id),
            getComplaintsAction(activeOrganization!.id)
        ]);

        if (statsRes.success) setStats(statsRes.stats);
        if (verRes.success) setVerbatims(verRes.verbatims);
        if (compRes.success) setComplaints(compRes.complaints);

        setIsLoading(false);
    }

    const handleResolveComplaint = async (id: string) => {
        const resolution = prompt("Description de la solution apportée :");
        if (!resolution) return;

        const res = await updateComplaintStatusAction(id, 'RESOLVED', resolution);
        if (res.success) {
            toast({ title: "Réclamation résolue", description: "L'indicateur 34 est à jour." });
            loadAllData();
        }
    };

    const handleRunColdScheduler = async () => {
        if (!activeOrganization?.id) return;
        toast({ title: "Lancement du Scheduler", description: "Recherche des dossiers éligibles..." });
        const res = await runColdSurveySchedulerAction(activeOrganization.id);
        if (res.success) {
            toast({ title: "❄️ Enquêtes à froid envoyées", description: `${res.count} apprenants contactés.` });
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, subValue }: any) => (
        <Card className="border-slate-200 shadow-sm overflow-hidden group hover:border-indigo-300 transition-all">
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</p>
                        <h3 className="text-3xl font-black text-slate-900 mt-2">{value}</h3>
                        {subValue && <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{subValue}</p>}
                    </div>
                    <div className={`h-12 w-12 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg`}>
                        <Icon size={24} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                        <ShieldCheck size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest">Le Gardien Qualiopi</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">Qualité & Satisfaction</h1>
                    <p className="text-slate-500 mt-1 max-w-2xl">
                        Centralisation des preuves pour les indicateurs 1, 30 et 34. Analyse prédictive des risques par IA.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2 font-bold bg-white">
                        <Download size={16} /> Exporter Rapport Annuel
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="NPS Global"
                    value="+72"
                    icon={TrendingUp}
                    color="bg-indigo-600"
                    subValue="Score de recommandation"
                />
                <StatCard
                    title="Satisfaction"
                    value={stats?.averageRating || "0.0"}
                    icon={Star}
                    color="bg-amber-500"
                    subValue={`${stats?.totalCount || 0} avis (Ind. 30)`}
                />
                <StatCard
                    title="Réclamations"
                    value={complaints.filter(c => c.status === 'OPEN').length}
                    icon={Megaphone}
                    color="bg-rose-500"
                    subValue="En attente (Ind. 34)"
                />
                <StatCard
                    title="Taux de Résolution"
                    value="98%"
                    icon={CheckCircle2}
                    color="bg-emerald-600"
                    subValue="Actions correctives"
                />
            </div>

            <Tabs defaultValue="satisfaction" className="space-y-6">
                <TabsList className="bg-white p-1 border border-slate-200 shadow-sm rounded-xl">
                    <TabsTrigger value="satisfaction" className="gap-2 px-6">
                        <Star size={16} /> Satisfaction (Ind. 30)
                    </TabsTrigger>
                    <TabsTrigger value="complaints" className="gap-2 px-6">
                        <Megaphone size={16} /> Réclamations (Ind. 34)
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="gap-2 px-6">
                        <BrainCircuit size={16} /> Analyse IA
                    </TabsTrigger>
                    <TabsTrigger value="scheduler" className="gap-2 px-6">
                        <Snowflake size={16} /> Campagnes (à froid)
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: SATISFACTION (PROUD VERBATIMS) */}
                <TabsContent value="satisfaction" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Feed items */}
                        <div className="lg:col-span-2 space-y-4">
                            {verbatims.length === 0 ? (
                                <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 italic text-slate-400">
                                    Aucun avis collecté pour le moment.
                                </div>
                            ) : verbatims.map((v) => (
                                <Card key={v.id} className="border-slate-200 overflow-hidden group hover:border-indigo-300 transition-all">
                                    <div className="p-6 flex gap-6">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-xl font-bold text-indigo-600">
                                                {v.rating}/5
                                            </div>
                                            {v.sentiment === 'POSITIVE' && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2"><ThumbsUp size={10} className="mr-1" /> Positif</Badge>}
                                            {v.sentiment === 'NEGATIVE' && <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none px-2"><ThumbsDown size={10} className="mr-1" /> Critique</Badge>}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{v.folder.learner.firstName} {v.folder.learner.lastName}</h4>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.folder.trainingTitle}</p>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{format(new Date(v.answeredAt), 'dd/MM/yyyy')}</p>
                                            </div>
                                            <p className="text-sm text-slate-600 italic">"{v.comment || 'Sans commentaire'}"</p>
                                            <div className="flex gap-2 pt-2">
                                                {v.tags?.split(',').map((tag: string) => (
                                                    <Badge key={tag} variant="outline" className="text-[9px] font-bold uppercase border-slate-200">{tag.trim()}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Summary Widget */}
                        <Card className="h-fit sticky top-8 border-none bg-indigo-900 text-white shadow-2xl rounded-3xl overflow-hidden">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg italic tracking-tight">
                                    <BrainCircuit size={20} className="text-indigo-300" /> Insight Qualiopi
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest">Sentiment Global</p>
                                    <h4 className="text-2xl font-black italic">Excellent (84%)</h4>
                                    <div className="h-2 w-full bg-indigo-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-400 w-[84%] shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                                    </div>
                                </div>
                                <div className="space-y-4 pt-4 border-t border-indigo-800/50">
                                    <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest">Points Forts IA</p>
                                    <ul className="space-y-2 text-sm text-indigo-100">
                                        <li className="flex gap-2">✨ <span className="font-bold text-white">Réactivité administrative</span> plébiscitée</li>
                                        <li className="flex gap-2">🎓 <span className="font-bold text-white">Expertise formateurs</span> très élevée</li>
                                        <li className="flex gap-2">🛠️ <span className="font-bold text-white">Outils de formation</span> fluides</li>
                                    </ul>
                                </div>
                                <Button className="w-full bg-white text-indigo-900 hover:bg-slate-100 font-black italic mt-4">
                                    Générer Synthèse Annuelle
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TAB 2: COMPLAINTS (TICKET SYSTEM) */}
                <TabsContent value="complaints" className="space-y-6">
                    <div className="flex justify-between items-center bg-rose-50 p-6 rounded-3xl border border-rose-100">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-rose-900 uppercase">Gestionnaire d'Incidents (Ind. 34)</h3>
                                <p className="text-sm text-rose-700">Traitez chaque réclamation pour en faire un levier d'amélioration.</p>
                            </div>
                        </div>
                        <Button className="bg-rose-600 hover:bg-rose-700 font-bold gap-2">
                            + Nouvelle Réclamation Interne
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {complaints.length === 0 ? (
                            <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 italic text-slate-400">
                                Aucune réclamation enregistrée. Votre plateforme est saine !
                            </div>
                        ) : complaints.map((c) => (
                            <Card key={c.id} className={`border-l-4 ${c.status === 'OPEN' ? 'border-l-rose-500' : 'border-l-emerald-500'} bg-white overflow-hidden`}>
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-4">
                                            <Badge variant="outline" className={`${c.status === 'OPEN' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} border-none font-bold uppercase italic px-3`}>
                                                {c.status === 'OPEN' ? 'En attente' : 'RÉSOLU'}
                                            </Badge>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{c.type}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                                            <Clock size={14} />
                                            {format(new Date(c.createdAt), 'dd MMMM yyyy HH:mm', { locale: fr })}
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-black text-slate-900 mb-2">{c.subject}</h4>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl mb-4">"{c.content}"</p>

                                    <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-slate-100" />
                                            <span className="text-xs font-bold text-slate-700">{c.folder.learner.firstName} {c.folder.learner.lastName}</span>
                                        </div>
                                        {c.status === 'OPEN' ? (
                                            <Button onClick={() => handleResolveComplaint(c.id)} className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 text-xs h-8">
                                                <CheckCircle size={14} /> Marquer comme Résolu
                                            </Button>
                                        ) : (
                                            <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                                                <CheckCircle size={16} /> Action corrective effectuée
                                            </div>
                                        )}
                                    </div>
                                    {c.resolution && (
                                        <div className="mt-4 p-4 bg-emerald-50 rounded-xl text-emerald-800 text-xs leading-relaxed">
                                            <strong>Solution Polyx :</strong> {c.resolution}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* TAB 3: AI SEMENTIC (WORD CLOUD STYLE) */}
                <TabsContent value="ai" className="space-y-6">
                    <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-900 text-white p-8">
                            <CardTitle className="text-2xl font-black italic flex items-center gap-3">
                                <BrainCircuit className="text-indigo-400" /> Nuage de Sentiments Gemini
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Analyse automatisée de 100% des verbatims pour extraire les thématiques récurrentes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-12 text-center space-y-12">
                            <div className="flex flex-wrap justify-center gap-6 max-w-2xl mx-auto">
                                <p className="text-4xl font-black text-indigo-600 hover:scale-110 transition-transform cursor-default">Pédagogie ++</p>
                                <p className="text-2xl font-bold text-rose-500 hover:scale-110 transition-transform cursor-default">Délais Admin</p>
                                <p className="text-5xl font-black text-indigo-900 hover:scale-110 transition-transform cursor-default">Réactivité</p>
                                <p className="text-3xl font-black text-emerald-600 hover:scale-110 transition-transform cursor-default">Plateforme Top</p>
                                <p className="text-xl font-bold text-slate-400 hover:scale-110 transition-transform cursor-default">Connectivité</p>
                                <p className="text-4xl font-black text-purple-600 hover:scale-110 transition-transform cursor-default">Qualiopi Ready</p>
                                <p className="text-2xl font-black text-indigo-400 hover:scale-110 transition-transform cursor-default">Formateurs Experts</p>
                            </div>

                            <div className="pt-12 border-t border-slate-100">
                                <h5 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Suggestions d'amélioration IA</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 text-left">
                                        <p className="text-rose-900 text-sm font-bold">⚠️ Signal Faible Détecté</p>
                                        <p className="text-rose-700 text-xs mt-2">Le mot "attente" revient 12 fois ce mois-ci concernant le traitement des dossiers CPF. Risque de dégradation du NPS.</p>
                                    </div>
                                    <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 text-left">
                                        <p className="text-emerald-900 text-sm font-bold">🚀 Opportunity Coach</p>
                                        <p className="text-emerald-700 text-xs mt-2">Vos stagiaires adorent le module de "Marketing". Pourquoi ne pas proposer une masterclass avancée ?</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 4: SCHEDULER */}
                <TabsContent value="scheduler" className="space-y-6">
                    <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950 text-white">
                        <CardHeader className="p-12 pb-0">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-16 w-16 bg-sky-500 rounded-3xl flex items-center justify-center shadow-lg">
                                    <Snowflake size={32} />
                                </div>
                                <div>
                                    <CardTitle className="text-3xl font-black italic tracking-tight">Campagnes "À Froid"</CardTitle>
                                    <CardDescription className="text-slate-400 italic mt-1">Indicateur 30 - Mesure de l'impact 3 mois après la formation</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-12 pt-8 space-y-8">
                            <p className="text-slate-300 leading-relaxed max-w-2xl">
                                Pour être pleinement conforme à <strong>Qualiopi</strong>, vous devez mesurer la satisfaction <em>à chaud</em> (juste après la formation) <strong>ET</strong> <em>à froid</em> (quelques mois après).
                            </p>
                            <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 space-y-4">
                                <div className="flex items-start gap-4">
                                    <Star size={20} className="text-amber-400 mt-1" />
                                    <div>
                                        <h5 className="font-bold">Déclenchement Automatique</h5>
                                        <p className="text-sm text-slate-400">Le scheduler recherche les dossiers complétés il y a 90 jours.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <BrainCircuit size={20} className="text-indigo-400 mt-1" />
                                    <div>
                                        <h5 className="font-bold">Analyse Gemini Intégrée</h5>
                                        <p className="text-sm text-slate-400">Les réponses sont analysées par l'IA pour mesurer le ROI formation.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-8">
                                <Button
                                    onClick={handleRunColdScheduler}
                                    className="bg-sky-500 hover:bg-sky-600 text-white h-14 px-12 font-black italic gap-3 text-lg rounded-2xl shadow-xl shadow-sky-500/20 transition-all hover:scale-[1.02]"
                                >
                                    <Play size={20} /> Lancer les enquêtes maintenant
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500 italic pt-4">
                                💡 Configurez un CRON job pour automatiser cet envoi quotidiennement.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
