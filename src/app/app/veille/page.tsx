'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Radar, BookOpen, Scale, Accessibility, Cpu, Plus,
    ExternalLink, BrainCircuit, CheckCircle2, Clock,
    Sparkles, FileText, Users, Building2, AlertTriangle,
    Eye, ChevronRight, Zap
} from 'lucide-react';
import {
    getWatchArticlesAction,
    createWatchArticleAction,
    markArticleAsReadAction,
    analyzeArticleWithAIAction,
    createImpactActionAction,
    getEcosystemPartnersAction,
    createEcosystemPartnerAction,
    getVeilleStatsAction
} from '@/application/actions/veille.actions';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

const CATEGORIES = [
    { id: 'LEGAL', label: 'Légal & Financier', icon: Scale, indicator: 'I.23', color: 'bg-amber-500' },
    { id: 'METIERS', label: 'Métiers & Compétences', icon: BookOpen, indicator: 'I.24', color: 'bg-indigo-500' },
    { id: 'PEDAGOGIE', label: 'Pédagogie & Tech', icon: Cpu, indicator: 'I.25', color: 'bg-purple-500' },
    { id: 'HANDICAP', label: 'Écosystème & Handicap', icon: Accessibility, indicator: 'I.26', color: 'bg-rose-500' }
];

const PARTNER_TYPES = [
    { id: 'AGEFIPH', label: 'AGEFIPH' },
    { id: 'CAP_EMPLOI', label: 'Cap Emploi' },
    { id: 'OPCO', label: 'OPCO' },
    { id: 'CFA', label: 'CFA' },
    { id: 'EXPERT', label: 'Expert/Consultant' },
    { id: 'OTHER', label: 'Autre' }
];

export default function VeillePage() {
    const { activeOrganization, user } = useAuthStore();
    const { toast } = useToast();

    const [articles, setArticles] = useState<any[]>([]);
    const [partners, setPartners] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState<any>(null);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);

    // Form states
    const [showAddArticle, setShowAddArticle] = useState(false);
    const [showAddPartner, setShowAddPartner] = useState(false);
    const [newArticle, setNewArticle] = useState({ title: '', url: '', source: '', category: 'LEGAL', notes: '' });
    const [newPartner, setNewPartner] = useState({ name: '', type: 'AGEFIPH', domain: '', contactEmail: '', website: '' });

    useEffect(() => {
        if (activeOrganization?.id) {
            loadAllData();
        }
    }, [activeOrganization?.id]);

    async function loadAllData() {
        setIsLoading(true);
        const [articlesRes, partnersRes, statsRes] = await Promise.all([
            getWatchArticlesAction(activeOrganization!.id),
            getEcosystemPartnersAction(activeOrganization!.id),
            getVeilleStatsAction(activeOrganization!.id)
        ]);

        if (articlesRes.success) setArticles(articlesRes.articles);
        if (partnersRes.success) setPartners(partnersRes.partners);
        if (statsRes.success) setStats(statsRes.stats);
        setIsLoading(false);
    }

    async function handleAddArticle() {
        if (!newArticle.title) {
            toast({ title: "Titre requis", variant: "destructive" });
            return;
        }

        const res = await createWatchArticleAction({
            organisationId: activeOrganization!.id,
            ...newArticle
        });

        if (res.success) {
            toast({ title: "Article ajouté", description: "Vous pouvez maintenant l'analyser avec l'IA." });
            setShowAddArticle(false);
            setNewArticle({ title: '', url: '', source: '', category: 'LEGAL', notes: '' });
            loadAllData();
        }
    }

    async function handleAnalyze(articleId: string) {
        setAnalyzingId(articleId);
        toast({ title: "🤖 Analyse en cours...", description: "Gemini traite votre article." });

        const res = await analyzeArticleWithAIAction(articleId);

        if (res.success) {
            toast({ title: "✨ Analyse terminée", description: "L'IA a généré des recommandations." });
            setSelectedArticle(res.article);
            loadAllData();
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
        setAnalyzingId(null);
    }

    async function handleMarkRead(articleId: string) {
        await markArticleAsReadAction(articleId, user?.id || '');
        loadAllData();
    }

    async function handleCreateAction(articleId: string, title: string) {
        await createImpactActionAction({ articleId, title });
        toast({ title: "Action créée", description: "Traçabilité Qualiopi assurée." });
        loadAllData();
    }

    async function handleAddPartner() {
        if (!newPartner.name) {
            toast({ title: "Nom requis", variant: "destructive" });
            return;
        }

        const res = await createEcosystemPartnerAction({
            organisationId: activeOrganization!.id,
            ...newPartner
        });

        if (res.success) {
            toast({ title: "Partenaire ajouté" });
            setShowAddPartner(false);
            setNewPartner({ name: '', type: 'AGEFIPH', domain: '', contactEmail: '', website: '' });
            loadAllData();
        }
    }

    const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.id === cat) || CATEGORIES[0];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-purple-600 mb-1">
                        <Radar size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest">Critère 6 - Qualiopi</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">Veille & Écosystème</h1>
                    <p className="text-slate-500 mt-1 max-w-2xl">
                        Centralisez votre veille réglementaire, métiers et pédagogique. Transformez les informations en actions traçables.
                    </p>
                </div>
                <Button onClick={() => setShowAddArticle(true)} className="bg-purple-600 hover:bg-purple-700 font-bold gap-2">
                    <Plus size={18} /> Ajouter un article
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CATEGORIES.map(cat => (
                    <Card key={cat.id} className="border-slate-200 overflow-hidden">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className={`h-12 w-12 ${cat.color} rounded-2xl flex items-center justify-center text-white`}>
                                <cat.icon size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900">{stats?.byCategory?.[cat.id] || 0}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{cat.indicator}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Tabs defaultValue="articles" className="space-y-6">
                <TabsList className="bg-white p-1 border border-slate-200 shadow-sm rounded-xl">
                    <TabsTrigger value="articles" className="gap-2 px-6">
                        <FileText size={16} /> Articles de Veille
                    </TabsTrigger>
                    <TabsTrigger value="partners" className="gap-2 px-6">
                        <Users size={16} /> Écosystème (I.26)
                    </TabsTrigger>
                </TabsList>

                {/* ARTICLES TAB */}
                <TabsContent value="articles" className="space-y-6">
                    {/* Add Article Form */}
                    {showAddArticle && (
                        <Card className="border-purple-200 bg-purple-50/50">
                            <CardContent className="p-6 space-y-4">
                                <h3 className="font-bold text-purple-900">Nouvel article de veille</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input placeholder="Titre de l'article *" value={newArticle.title} onChange={e => setNewArticle({ ...newArticle, title: e.target.value })} />
                                    <Input placeholder="URL (optionnel)" value={newArticle.url} onChange={e => setNewArticle({ ...newArticle, url: e.target.value })} />
                                    <Input placeholder="Source (ex: Legifrance)" value={newArticle.source} onChange={e => setNewArticle({ ...newArticle, source: e.target.value })} />
                                    <select className="h-10 rounded-md border border-slate-200 px-3" value={newArticle.category} onChange={e => setNewArticle({ ...newArticle, category: e.target.value })}>
                                        {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                                    </select>
                                </div>
                                <textarea className="w-full h-20 rounded-md border border-slate-200 p-3 text-sm" placeholder="Notes personnelles..." value={newArticle.notes} onChange={e => setNewArticle({ ...newArticle, notes: e.target.value })} />
                                <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={() => setShowAddArticle(false)}>Annuler</Button>
                                    <Button onClick={handleAddArticle} className="bg-purple-600">Ajouter</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Articles List */}
                        <div className="lg:col-span-2 space-y-4">
                            {articles.length === 0 ? (
                                <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 italic text-slate-400">
                                    Aucun article de veille. Commencez par en ajouter un !
                                </div>
                            ) : articles.map(article => {
                                const catInfo = getCategoryInfo(article.category);
                                return (
                                    <Card
                                        key={article.id}
                                        className={`border-slate-200 overflow-hidden cursor-pointer transition-all hover:shadow-md ${selectedArticle?.id === article.id ? 'ring-2 ring-purple-500' : ''}`}
                                        onClick={() => setSelectedArticle(article)}
                                    >
                                        <CardContent className="p-5">
                                            <div className="flex gap-4">
                                                <div className={`h-10 w-10 ${catInfo.color} rounded-xl flex items-center justify-center text-white shrink-0`}>
                                                    <catInfo.icon size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className="font-bold text-slate-900 truncate">{article.title}</h4>
                                                        <Badge variant="outline" className={`shrink-0 text-[9px] ${article.status === 'UNREAD' ? 'bg-amber-50 text-amber-700' : article.status === 'ANALYZED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50'}`}>
                                                            {article.status === 'UNREAD' ? 'Non lu' : article.status === 'READ' ? 'Lu' : article.status === 'ANALYZED' ? 'Analysé' : 'Actionné'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                                        {article.source && <span>{article.source}</span>}
                                                        <span>{formatDistanceToNow(new Date(article.createdAt), { addSuffix: true, locale: fr })}</span>
                                                    </div>
                                                    {article.aiSummary && (
                                                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{article.aiSummary}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Analysis Panel */}
                        <div className="space-y-4">
                            <Card className="border-none bg-slate-900 text-white rounded-3xl overflow-hidden sticky top-8">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <BrainCircuit size={20} className="text-purple-400" />
                                        {selectedArticle ? 'Analyse IA' : 'Sélectionnez un article'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {!selectedArticle ? (
                                        <p className="text-slate-400 italic text-sm">Cliquez sur un article pour voir son analyse ou en déclencher une nouvelle.</p>
                                    ) : (
                                        <>
                                            <div>
                                                <h4 className="font-bold text-white mb-2">{selectedArticle.title}</h4>
                                                {selectedArticle.url && (
                                                    <a href={selectedArticle.url} target="_blank" className="text-purple-400 text-sm flex items-center gap-1 hover:underline">
                                                        <ExternalLink size={12} /> Voir l'article original
                                                    </a>
                                                )}
                                            </div>

                                            {!selectedArticle.aiSummary ? (
                                                <Button
                                                    onClick={() => handleAnalyze(selectedArticle.id)}
                                                    disabled={analyzingId === selectedArticle.id}
                                                    className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
                                                >
                                                    {analyzingId === selectedArticle.id ? (
                                                        <><Sparkles size={16} className="animate-spin" /> Analyse en cours...</>
                                                    ) : (
                                                        <><Sparkles size={16} /> Analyser avec Gemini</>
                                                    )}
                                                </Button>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-slate-800 rounded-xl space-y-2">
                                                        <p className="text-[10px] font-bold text-purple-400 uppercase">Résumé</p>
                                                        <p className="text-sm text-slate-200">{selectedArticle.aiSummary}</p>
                                                    </div>
                                                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                                                        <p className="text-[10px] font-bold text-amber-400 uppercase">Impact</p>
                                                        <p className="text-sm text-amber-100">{selectedArticle.aiImpact}</p>
                                                    </div>
                                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                                                        <p className="text-[10px] font-bold text-emerald-400 uppercase">Recommandations</p>
                                                        <p className="text-sm text-emerald-100 whitespace-pre-line">{selectedArticle.aiRecommendations}</p>
                                                    </div>

                                                    {selectedArticle.actions?.length === 0 && (
                                                        <Button
                                                            onClick={() => handleCreateAction(selectedArticle.id, "Action suite à veille: " + selectedArticle.title.substring(0, 30))}
                                                            className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                                                        >
                                                            <Zap size={16} /> Créer une action corrective
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* PARTNERS TAB */}
                <TabsContent value="partners" className="space-y-6">
                    <div className="flex justify-between items-center bg-rose-50 p-6 rounded-3xl border border-rose-100">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <Accessibility size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-rose-900">Registre Écosystème (I.26)</h3>
                                <p className="text-sm text-rose-700">Vos partenaires pour l'accueil des publics spécifiques.</p>
                            </div>
                        </div>
                        <Button onClick={() => setShowAddPartner(true)} className="bg-rose-600 hover:bg-rose-700 gap-2">
                            <Plus size={16} /> Ajouter un partenaire
                        </Button>
                    </div>

                    {showAddPartner && (
                        <Card className="border-rose-200 bg-rose-50/50">
                            <CardContent className="p-6 space-y-4">
                                <h3 className="font-bold text-rose-900">Nouveau partenaire</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input placeholder="Nom de l'organisme *" value={newPartner.name} onChange={e => setNewPartner({ ...newPartner, name: e.target.value })} />
                                    <select className="h-10 rounded-md border border-slate-200 px-3" value={newPartner.type} onChange={e => setNewPartner({ ...newPartner, type: e.target.value })}>
                                        {PARTNER_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                    </select>
                                    <Input placeholder="Domaine (ex: Handicap moteur)" value={newPartner.domain} onChange={e => setNewPartner({ ...newPartner, domain: e.target.value })} />
                                    <Input placeholder="Email de contact" value={newPartner.contactEmail} onChange={e => setNewPartner({ ...newPartner, contactEmail: e.target.value })} />
                                    <Input placeholder="Site web" value={newPartner.website} onChange={e => setNewPartner({ ...newPartner, website: e.target.value })} />
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={() => setShowAddPartner(false)}>Annuler</Button>
                                    <Button onClick={handleAddPartner} className="bg-rose-600">Ajouter</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {partners.length === 0 ? (
                            <div className="col-span-full p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 italic text-slate-400">
                                Aucun partenaire enregistré. Ajoutez vos contacts AGEFIPH, Cap Emploi, etc.
                            </div>
                        ) : partners.map(partner => (
                            <Card key={partner.id} className="border-slate-200 hover:shadow-md transition-all">
                                <CardContent className="p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                                            <Building2 size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-900">{partner.name}</h4>
                                            <Badge variant="outline" className="mt-1 text-[9px]">{partner.type}</Badge>
                                            {partner.domain && <p className="text-xs text-slate-500 mt-2">{partner.domain}</p>}
                                            {partner.contactEmail && (
                                                <a href={`mailto:${partner.contactEmail}`} className="text-indigo-600 text-xs hover:underline block mt-2">{partner.contactEmail}</a>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
