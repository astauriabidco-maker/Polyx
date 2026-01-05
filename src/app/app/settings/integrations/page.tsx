'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { getProvidersAction, createProviderAction, revokeProviderAction, generateOnboardingLinkAction } from '@/application/actions/providers.actions';
import { getProviderDashboardStats, ProviderStats, getAdvancedProviderStats } from '@/application/actions/analytics.providers.actions';
import { getIntegrationConfigAction, updateIntegrationConfigAction, getBranchMappingsAction, deleteBranchMappingAction } from '@/application/actions/config.actions';
import { ApiProvider } from '@/infrastructure/mock-db';
import { Copy, Trash, Trash2, Plus, ShieldCheck, ShieldAlert, Key, Building2, User, Phone, Mail, Edit, LayoutDashboard, Users as UsersIcon, TrendingUp, BrainCircuit, AlertTriangle, Settings, Save } from 'lucide-react';
import { ProviderDetailsForm } from '@/components/settings/provider-details-form';
import { ProviderKPICards } from '@/components/settings/provider-kpi-cards';
import { ProviderEvolutionChart, ProviderStatusPie } from '@/components/settings/provider-charts';
import { Label } from '@/components/ui/label';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { PageGuide } from '@/components/ui/page-guide';


export default function IntegrationsPage() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'providers' | 'intelligence' | 'configuration'>('dashboard');

    // Data State
    const [providers, setProviders] = useState<ApiProvider[]>([]);
    const [stats, setStats] = useState<ProviderStats | null>(null);
    const [advancedStats, setAdvancedStats] = useState<any | null>(null);
    const [config, setConfig] = useState<any | null>(null);
    const [mappings, setMappings] = useState<any[]>([]);

    // UI State
    const [isCreating, setIsCreating] = useState(false);
    const [newProviderName, setNewProviderName] = useState('');
    const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null);
    const [editingProvider, setEditingProvider] = useState<ApiProvider | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [list, dashboardStats, advStats, conf, map] = await Promise.all([
            getProvidersAction(),
            getProviderDashboardStats(),
            getAdvancedProviderStats(),
            getIntegrationConfigAction(),
            getBranchMappingsAction()
        ]);
        setProviders(list);
        setStats(dashboardStats);
        setAdvancedStats(advStats);
        setConfig(conf);
        setMappings(map);
    };

    const handleCreate = async () => {
        if (!newProviderName) return;
        const res = await createProviderAction(newProviderName);
        if (res.success && res.apiKey) {
            setLastCreatedKey(res.apiKey);
            setNewProviderName('');
            setIsCreating(false);
            loadData();
        }
    };

    const handleRevoke = async (id: string) => {
        if (confirm('Êtes-vous sûr de vouloir révoquer cet accès ? Cette action est irréversible.')) {
            await revokeProviderAction(id);
            loadData();
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto text-slate-50">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                        <ShieldCheck className="text-indigo-500" />
                        Partenaires & Intégrations
                    </h1>
                    <p className="text-slate-400">Gérez vos sources de leads et surveillez leur performance.</p>
                </div>

                <div className="flex items-center gap-4">
                    {activeTab === 'configuration' && (
                        <PageGuide
                            title="Configurer le Module"
                            steps={[
                                { title: "Paramètres Financiers", description: "Définissez la valeur moyenne d'un panier pour calculer automatiquement le ROI de chaque source." },
                                { title: "Mapping des Agences", description: "Reliez les identifiants envoyés par vos apporteurs d'affaires (ex: '75001') à vos agences internes." }
                            ]}
                        />
                    )}
                    {activeTab === 'intelligence' && (
                        <PageGuide
                            title="Analyse de Performance"
                            steps={[
                                { title: "ROI Global", description: "Le retour sur investissement calculé sur tous vos canaux." },
                                { title: "Insights IA", description: "Des recommandations automatiques (Stop/Scale) basées sur la qualité et le coût des leads." },
                                { title: "Matrice Financière", description: "Tableau détaillé comparant le coût d'acquisition au revenu potentiel généré." }
                            ]}
                        />
                    )}
                    {activeTab === 'providers' && (
                        <PageGuide
                            title="Gestion des Partenaires"
                            steps={[
                                { title: "Création", description: "Générez une clé API unique pour chaque nouveau partenaire ou source de trafic." },
                                { title: "Invitation", description: "Envoyez un lien d'onboarding pour qu'ils remplissent eux-mêmes leurs informations administratives." },
                                { title: "Conformité", description: "Suivez le statut de conformité (RGPD, Contrat) via les indicateurs de couleur." }
                            ]}
                        />
                    )}
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <LayoutDashboard size={16} /> Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('intelligence')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'intelligence' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <BrainCircuit size={16} /> Intelligence
                        </button>
                        <button
                            onClick={() => setActiveTab('providers')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'providers' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <UsersIcon size={16} /> Gestion
                        </button>
                        <button
                            onClick={() => setActiveTab('configuration')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'configuration' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <Settings size={16} /> Configuration
                        </button>
                    </div>
                </div>
            </div>

            {/* --- DASHBOARD TAB --- */}
            {activeTab === 'dashboard' && stats && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <ProviderKPICards stats={stats} />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <ProviderEvolutionChart data={stats.timeSeriesData} />
                        <ProviderStatusPie data={stats.statusDistribution} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Recent Activity */}
                        <Card className="bg-slate-900 border-slate-800 md:col-span-3">
                            <CardHeader>
                                <CardTitle className="text-slate-200">Derniers Imports</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {stats.recentLeads.map(lead => (
                                        <div key={lead.id} className="flex items-center gap-3 p-3 rounded bg-slate-950/50 border border-slate-800">
                                            <div className={`w-2 h-2 rounded-full ${lead.status === 'QUALIFIED' ? 'bg-green-500' : 'bg-blue-500'}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-300 truncate">{lead.name}</p>
                                                <p className="text-xs text-slate-500 truncate">{lead.provider}</p>
                                            </div>
                                            <span className="text-xs text-slate-600">
                                                {new Date(lead.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))}
                                    {stats.recentLeads.length === 0 && (
                                        <p className="text-sm text-slate-500 italic text-center">Aucun lead récent.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* --- PROVIDERS MANAGEMENT TAB --- */}
            {activeTab === 'providers' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Documentation Card */}
                    <Card className="bg-indigo-950/30 border-indigo-500/30 mb-8">
                        <CardHeader>
                            <CardTitle className="text-indigo-200 flex items-center gap-2">
                                <Building2 size={20} />
                                Guide d'intégration API
                            </CardTitle>
                            <CardDescription className="text-indigo-300/70">
                                Transmettez ces informations à vos prestataires techniques pour qu'ils puissent envoyer des leads.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Endpoint Bulk (Recommandé)</p>
                                    <code className="text-sm text-green-400 font-mono select-all">
                                        POST /api/v1/leads/bulk
                                    </code>
                                </div>
                                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Documentation Technique</p>
                                    <a
                                        href="/docs/api"
                                        target="_blank"
                                        className="text-sm text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
                                    >
                                        <ShieldCheck size={14} />
                                        Consulter la documentation officielle
                                    </a>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Creation Card */}
                    <Card className="bg-slate-900 border-slate-800 mb-8">
                        <CardHeader>
                            <CardTitle className="text-slate-200">Nouveau Partenaire</CardTitle>
                            <CardDescription>Ajoutez un nouveau générateur de lead ou centre d'appel.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4">
                                <Input
                                    placeholder="Nom du partenaire (ex: Facebook Ads Hiver)"
                                    className="bg-slate-950 border-slate-700 text-slate-200"
                                    value={newProviderName}
                                    onChange={(e) => setNewProviderName(e.target.value)}
                                />
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
                                    onClick={handleCreate}
                                    disabled={!newProviderName}
                                >
                                    <Plus size={16} className="mr-2" />
                                    Générer Accès
                                </Button>
                            </div>

                            {lastCreatedKey && (
                                <div className="mt-4 p-4 bg-green-900/20 border border-green-500/50 rounded-lg animate-in fade-in slide-in-from-top-2">
                                    <h4 className="text-green-400 font-bold mb-2 flex items-center gap-2">
                                        <Key size={16} />
                                        Clé API Générée
                                    </h4>
                                    <div className="flex items-center gap-2 font-mono bg-slate-950 p-2 rounded border border-green-500/30 text-green-300">
                                        <span className="flex-1 truncate">{lastCreatedKey}</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 hover:bg-green-500/20 hover:text-green-300"
                                            onClick={() => navigator.clipboard.writeText(lastCreatedKey)}
                                        >
                                            <Copy size={12} />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Enhanced List */}
                    <div className="grid gap-6">
                        {providers.map(provider => (
                            <Card key={provider.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                                                    {provider.complianceStatus === 'VERIFIED' ? (
                                                        <ShieldCheck size={18} className="text-green-500" />
                                                    ) : (
                                                        <ShieldAlert size={18} className="text-amber-500" />
                                                    )}
                                                    {provider.name}
                                                </h3>
                                                <Badge variant="outline" className="text-indigo-400 border-indigo-400/30">
                                                    {provider.providerType || 'LEAD_GENERATOR'}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-500 flex items-center gap-2">
                                                <Building2 size={12} />
                                                {provider.legalName || 'Raison sociale non renseignée'}
                                                {provider.siret && <span className="text-slate-600">({provider.siret})</span>}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                                                onClick={async () => {
                                                    const link = await generateOnboardingLinkAction(provider.id);
                                                    if (link) {
                                                        const fullUrl = `${window.location.origin}${link}`;
                                                        navigator.clipboard.writeText(fullUrl);
                                                        alert(`Lien d'invitation copié : ${fullUrl}`);
                                                    }
                                                }}
                                            >
                                                <ShieldCheck size={14} className="mr-2" />
                                                Inviter
                                            </Button>

                                            <Sheet>
                                                <SheetTrigger asChild>
                                                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800"
                                                        onClick={() => setEditingProvider(provider)}
                                                    >
                                                        <Edit size={14} className="mr-2" />
                                                        Éditer
                                                    </Button>
                                                </SheetTrigger>
                                                <SheetContent className="bg-white text-slate-900 sm:max-w-xl overflow-y-auto">
                                                    <SheetHeader className="mb-6">
                                                        <SheetTitle>Modifier le Partenaire</SheetTitle>
                                                    </SheetHeader>
                                                    {editingProvider && (
                                                        <ProviderDetailsForm
                                                            provider={editingProvider}
                                                            onClose={() => {
                                                                loadData();
                                                            }}
                                                        />
                                                    )}
                                                </SheetContent>
                                            </Sheet>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:bg-red-500/10 hover:text-red-400"
                                                onClick={() => handleRevoke(provider.id)}
                                            >
                                                <Trash size={14} />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800/50">
                                        <div>
                                            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contact Principal</h5>
                                            {provider.contact?.name ? (
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex items-center gap-2 text-slate-300">
                                                        <User size={14} className="text-indigo-500" />
                                                        {provider.contact.name}
                                                        <span className="text-slate-600 text-xs">({provider.contact.role || 'N/A'})</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <Mail size={14} className="text-slate-600" />
                                                        {provider.contact.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <Phone size={14} className="text-slate-600" />
                                                        {provider.contact.phone}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-600 italic">Aucun contact renseigné.</p>
                                            )}
                                        </div>

                                        <div>
                                            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Accès API</h5>
                                            <div className="bg-slate-900 p-2 rounded border border-slate-800 font-mono text-xs text-slate-400 break-all mb-2">
                                                {provider.apiKey}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-green-500">
                                                <ShieldCheck size={12} />
                                                Clé Active • Créé le {new Date(provider.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
            {/* --- INTELLIGENCE TAB --- */}
            {activeTab === 'intelligence' && advancedStats && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">

                    {/* Global ROI Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-slate-900 border-slate-800 md:col-span-1">
                            <CardHeader>
                                <CardTitle className="text-slate-200 flex items-center gap-2">
                                    <TrendingUp className="text-green-500" />
                                    ROI Global
                                </CardTitle>
                                <CardDescription>Retour sur investissement moyen</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-green-400">
                                    {advancedStats.globalRoi.toFixed(2)}x
                                </div>
                                <p className="text-sm text-slate-500 mt-2">
                                    Pour 1€ investi, vous générez {(advancedStats.globalRoi).toFixed(2)}€ de valeur.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 border-slate-800 md:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-slate-200 flex items-center gap-2">
                                    <BrainCircuit className="text-indigo-500" />
                                    Insights IA
                                </CardTitle>
                                <CardDescription>Préconisations stratégiques basées sur la data.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {advancedStats.metrics.flatMap(m => m.insights.map((i, idx) => ({ ...i, provider: m.providerName, id: `${m.providerId}-${idx}` })))
                                    .slice(0, 3)
                                    .map(insight => (
                                        <div key={insight.id} className={`p-3 rounded border flex items-start gap-3 ${insight.type === 'SUCCESS' ? 'bg-green-950/30 border-green-500/30 text-green-200' :
                                            insight.type === 'DANGER' ? 'bg-red-950/30 border-red-500/30 text-red-200' :
                                                'bg-amber-950/30 border-amber-500/30 text-amber-200'
                                            }`}>
                                            <div className="mt-1">
                                                {insight.type === 'SUCCESS' ? <TrendingUp size={16} /> : <AlertTriangle size={16} />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{insight.provider}: {insight.message}</p>
                                                <p className="text-xs opacity-80">{insight.action}</p>
                                            </div>
                                        </div>
                                    ))}
                                {advancedStats.metrics.flatMap(m => m.insights).length === 0 && (
                                    <p className="text-slate-500 italic">Aucun insight critique pour le moment.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Financial Table */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-slate-200">Matrice de Performance Financière</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-950/50">
                                        <tr>
                                            <th className="px-4 py-3">Partenaire</th>
                                            <th className="px-4 py-3 text-right">Volume</th>
                                            <th className="px-4 py-3 text-right">Conv.</th>
                                            <th className="px-4 py-3 text-right">Coût Total</th>
                                            <th className="px-4 py-3 text-right">Rev. Potentiel</th>
                                            <th className="px-4 py-3 text-right">ROI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {advancedStats.metrics.map(m => (
                                            <tr key={m.providerId} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-300">{m.providerName}</td>
                                                <td className="px-4 py-3 text-right text-slate-400">{m.totalLeads}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${m.conversionRate > 20 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                        }`}>
                                                        {m.conversionRate.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-400">{m.totalCost.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                                                <td className="px-4 py-3 text-right text-indigo-400">{m.revenuePotential.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-200">{m.roi.toFixed(2)}x</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            {/* --- CONFIGURATION TAB --- */}
            {activeTab === 'configuration' && config && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">

                    {/* Financial Configuration */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-slate-200 flex items-center gap-2">
                                <Settings className="text-slate-400" />
                                Paramètres Financiers
                            </CardTitle>
                            <CardDescription>Définissez les variables clés pour le calcul du ROI.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 max-w-md">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-slate-300">Valeur Moyenne Panier (€)</Label>
                                        <HelpTooltip content="Montant moyen espéré pour une vente. Utilisé pour calculer le revenu potentiel des leads (ROI = Leads * Conv * Panier / Coût)." />
                                    </div>
                                    <Input
                                        type="number"
                                        value={config.averageCartValue}
                                        onChange={(e) => setConfig({ ...config, averageCartValue: parseFloat(e.target.value) })}
                                        className="bg-slate-950 border-slate-700 text-slate-100"
                                    />
                                    <p className="text-xs text-slate-500">Montant moyen d'une vente (ex: 1500€ pour un pack formation).</p>
                                </div>
                                <Button
                                    onClick={async () => {
                                        await updateIntegrationConfigAction('demo-org-id', { averageCartValue: config.averageCartValue });
                                        // toast.success("Configuration sauvegardée");
                                    }}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    <Save size={16} className="mr-2" /> Sauvegarder
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Mapping Configuration */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-slate-200">Correspondance des Agences</CardTitle>
                                <CardDescription>Associez les IDs externes (API) à vos Agences (Interne).</CardDescription>
                            </div>
                            <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                                <Plus size={16} className="mr-2" /> Ajouter
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-950/50">
                                        <tr>
                                            <th className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    ID Externe (Reçu)
                                                    <HelpTooltip content="L'identifiant de l'agence ou du point de vente envoyé par le partenaire via l'API (ex: 'AG-75')." />
                                                </div>
                                            </th>
                                            <th className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    Agence Interne (Cible)
                                                    <HelpTooltip content="L'agence de votre réseau à laquelle les leads seront automatiquement affectés." />
                                                </div>
                                            </th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {mappings.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-slate-500 italic">
                                                    Aucune correspondance définie.
                                                </td>
                                            </tr>
                                        )}
                                        {mappings.map((m: any) => (
                                            <tr key={m.id} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-slate-300">{m.externalBranchId}</td>
                                                <td className="px-4 py-3 text-slate-300">{m.internalBranchId}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={async () => {
                                                            await deleteBranchMappingAction('demo-org-id', m.externalBranchId);
                                                            const newMappings = await getBranchMappingsAction('demo-org-id');
                                                            setMappings(newMappings);
                                                        }}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
