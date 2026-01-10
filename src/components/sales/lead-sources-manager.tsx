'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Zap, Copy, FileSpreadsheet, Users, ShieldCheck, Globe, Link as LinkIcon, Plus, Info, CheckCircle2, AlertCircle, CreditCard, History, Clock } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { generateWebhookSecretAction, getWebhookSettingsAction } from '@/application/actions/webhook-settings.actions';
import { getProvidersAction, generateOnboardingLinkAction } from '@/application/actions/providers.actions';
import { useRouter } from 'next/navigation';

interface LeadSourcesManagerProps {
    orgId: string;
}

export function LeadSourcesManager({ orgId }: LeadSourcesManagerProps) {
    const router = useRouter();
    const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
    const [providers, setProviders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [origin, setOrigin] = useState('');
    const [selectedAuditProvider, setSelectedAuditProvider] = useState<any | null>(null);

    useEffect(() => {
        setOrigin(window.location.origin);
        loadData();
    }, [orgId]);

    const loadData = async () => {
        setIsLoading(true);
        const [webhookRes, providersRes] = await Promise.all([
            getWebhookSettingsAction(orgId),
            getProvidersAction()
        ]);

        if (webhookRes.success) setWebhookSecret(webhookRes.secret ?? null);
        setProviders(providersRes);
        setIsLoading(false);
    };

    const handleGenerateWebhook = async () => {
        if (webhookSecret && !confirm("Une nouvelle clé désactivera l'ancienne. Continuer ?")) return;
        setIsGenerating(true);
        const res = await generateWebhookSecretAction(orgId);
        if (res.success) setWebhookSecret(res.secret ?? null);
        setIsGenerating(false);
    };

    const handleCopyWebhook = () => {
        const url = `${origin}/api/webhooks/leads?orgId=${orgId}&secret=${webhookSecret}`;
        navigator.clipboard.writeText(url);
        alert("URL Webhook copiée !");
    };

    const handleGenerateOnboarding = async (providerId: string) => {
        const link = await generateOnboardingLinkAction(providerId);
        if (link) {
            navigator.clipboard.writeText(`${origin}${link}`);
            alert("Lien d'onboarding copié !");
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500 italic flex flex-col items-center gap-2">
        <Zap className="animate-pulse text-indigo-500" />
        Chargement de la configuration technique...
    </div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <header className="flex justify-between items-start border-b border-slate-800 pb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-100 flex items-center gap-3 italic tracking-tight">
                        <Globe className="text-indigo-400" size={28} />
                        HUB D'INTÉGRATIONS
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Configurez vos flux entrants et automatisez votre prospection.</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 px-3 py-1 flex items-center gap-1.5">
                        <AlertCircle size={12} /> 3 En Quarantaine
                    </Badge>
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3 py-1">
                        Mode Connecté
                    </Badge>
                </div>
            </header>

            <Tabs defaultValue="webhooks" className="w-full">
                <TabsList className="bg-slate-900 border border-slate-800 p-1 h-12">
                    <TabsTrigger value="webhooks" className="gap-2 px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold transition-all">
                        <Zap size={16} /> Webhooks
                    </TabsTrigger>
                    <TabsTrigger value="partners" className="gap-2 px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold transition-all">
                        <Users size={16} /> Partenaires API
                    </TabsTrigger>
                    <TabsTrigger value="stripe" className="gap-2 px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold transition-all">
                        <CreditCard size={16} /> Stripe Automation
                    </TabsTrigger>
                    <TabsTrigger value="csv" className="gap-2 px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold transition-all">
                        <FileSpreadsheet size={16} /> Import CSV
                    </TabsTrigger>
                </TabsList>

                {/* WEBHOOKS */}
                <TabsContent value="webhooks" className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
                                <CardHeader>
                                    <CardTitle className="text-sm uppercase tracking-widest text-indigo-400 font-black">Configuration Flux Leads</CardTitle>
                                    <CardDescription className="text-slate-500">
                                        Utilisez cette clé pour connecter vos sources de trafic payant.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Votre URL Webhook Unique</label>
                                            {webhookSecret && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Prêt à recevoir</span>}
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                readOnly
                                                value={webhookSecret ? `${origin}/api/webhooks/leads?orgId=${orgId}&secret=${webhookSecret}` : "Générez une clé pour obtenir l'URL"}
                                                className="bg-slate-950 border-slate-800 text-indigo-400 font-mono text-xs h-11"
                                            />
                                            {webhookSecret && (
                                                <Button size="icon" variant="outline" onClick={handleCopyWebhook} className="h-11 w-11 border-slate-800 hover:bg-slate-800">
                                                    <Copy size={16} />
                                                </Button>
                                            )}
                                            <Button size="sm" onClick={handleGenerateWebhook} disabled={isGenerating} className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 font-bold">
                                                {webhookSecret ? "Régénérer" : "Générer"}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                                        <p className="text-xs font-bold text-slate-400 mb-3 uppercase flex items-center gap-2">
                                            <Info size={14} className="text-indigo-400" />
                                            Payload JSON attendu
                                        </p>
                                        <pre className="text-[11px] text-emerald-400 font-mono leading-relaxed">
                                            {`{
  "firstName": "John",       // Requis
  "lastName": "Doe",        // Requis
  "email": "john@test.com", // Requis (ou phone)
  "phone": "+33612345678",  // Requis (ou email)
  "source": "FACEBOOK_ADS", // Optionnel (défaut: WEBHOOK)
  "customFields": {         // Données libres
     "votre_id": "12345",
     "projet": "Immobilier"
  }
}`}
                                        </pre>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-900 border-slate-800 text-slate-100">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Zap size={16} className="text-yellow-500" />
                                        Guide Rapide de Paramétrage
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm text-slate-400">
                                    <div className="flex gap-3">
                                        <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                                        <p><span className="text-slate-200 font-bold">Zapier / Make</span> : Utilisez le module "Webhooks by Zapier" (Custom POST) et collez l'URL ci-dessus.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                                        <p><span className="text-slate-200 font-bold">Facebook / TikTok Ads</span> : Passez par Zapier ou Bridge pour mapper vos formulaires vers notre webhook.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                                        <p><span className="text-slate-200 font-bold">Site Web / WordPress</span> : Utilisez un plugin (Elementor, CF7) ou un appel POST direct pour injecter vos prospects.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-xs font-bold shrink-0">!</div>
                                        <p className="italic text-xs">Note : Le scoring IA s'active automatiquement dès la réception. Un bonus de +30 pts est appliqué aux leads reçus via webhook (&lt; 15 min).</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card className="bg-indigo-600 text-white border-none shadow-xl shadow-indigo-500/10 overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <ShieldCheck size={120} />
                                </div>
                                <CardHeader>
                                    <CardTitle className="text-lg">Sécurité AES-256</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-indigo-100 leading-relaxed">
                                    Votre clé secrète est cryptée au repos. Ne la partagez jamais en clair. En cas de suspicion de fuite, utilisez le bouton <strong>"Régénérer"</strong> immédiatement.
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-900 border-slate-800 text-slate-100">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Zap size={16} className="text-emerald-500" /> Testeur d'API
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Simulez l'envoi d'un lead fictif pour vérifier que votre configuration fonctionne.
                                    </p>
                                    <Button
                                        size="sm"
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold h-10"
                                        onClick={async () => {
                                            const testPayload = {
                                                firstName: "Test",
                                                lastName: "Polyx",
                                                email: `test-${Date.now()}@polyx-simulator.com`,
                                                phone: "0612345678",
                                                source: "WEBHOOK_TEST"
                                            };
                                            try {
                                                const res = await fetch(`${origin}/api/webhooks/leads?orgId=${orgId}&secret=${webhookSecret}`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(testPayload)
                                                });
                                                if (res.ok) {
                                                    alert("✅ Test réussi ! Le lead fictif a été reçu correctement.");
                                                } else {
                                                    alert(`❌ Échec du test : ${res.status} ${res.statusText}`);
                                                }
                                            } catch (e: any) {
                                                alert(`❌ Erreur réseau : ${e.message}`);
                                            }
                                        }}
                                        disabled={!webhookSecret}
                                    >
                                        🧪 Tester ma configuration
                                    </Button>
                                    {!webhookSecret && (
                                        <p className="text-[10px] text-amber-400 italic text-center">Générez d'abord une clé Webhook pour activer le test.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* API PARTNERS */}
                <TabsContent value="partners" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <Card className="bg-slate-900 border-slate-800 text-slate-100">
                                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/50 pb-6">
                                    <div>
                                        <CardTitle className="text-sm uppercase tracking-widest text-indigo-400 font-black">Gestion des Apporteurs (API)</CardTitle>
                                        <CardDescription className="text-slate-500 mt-1">Fournisseurs de leads connectés en direct via API.</CardDescription>
                                    </div>
                                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={() => router.push('/app/settings/integrations')}>
                                        <Plus size={16} className="mr-2" /> Nouveau Partner
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-800">
                                        {providers.length === 0 ? (
                                            <div className="p-12 text-center text-slate-500 italic flex flex-col items-center gap-3">
                                                <Users size={40} className="text-slate-800" />
                                                Aucun partenaire API actif pour cet établissement.
                                            </div>
                                        ) : (
                                            providers.map(p => (
                                                <div key={p.id} className="p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg ${p.complianceStatus === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                                            {p.complianceStatus === 'VERIFIED' ? <ShieldCheck size={23} /> : <AlertCircle size={23} />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-slate-200">{p.name}</p>
                                                                <Badge variant="outline" className="text-[9px] uppercase tracking-tighter h-4 px-1">{p.providerType}</Badge>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 mt-0.5">ID: {p.id}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button size="sm" variant="outline" className="text-xs border-slate-800 hover:bg-slate-800 text-slate-400 h-9">
                                                                    <History size={14} className="mr-1.5" /> Audit
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl">
                                                                <DialogHeader>
                                                                    <DialogTitle className="flex items-center gap-2 italic">
                                                                        <History className="text-indigo-400" />
                                                                        JOURNAL D'AUDIT : {p.name}
                                                                    </DialogTitle>
                                                                    <DialogDescription className="text-slate-500">
                                                                        Historique complet des actions et changements de statut.
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                                                    {p.auditLogs?.length === 0 ? (
                                                                        <div className="py-10 text-center text-slate-500 italic">Aucun log enregistré.</div>
                                                                    ) : (
                                                                        p.auditLogs.slice().reverse().map((log: any, idx: number) => (
                                                                            <div key={idx} className="relative pl-6 pb-4 border-l border-slate-800 last:border-0 last:pb-0">
                                                                                <div className="absolute left-[-5px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                                                                                <div className="flex justify-between items-start mb-1">
                                                                                    <Badge className="text-[9px] font-black uppercase bg-slate-800 text-indigo-300 border-none px-1.5 h-4">
                                                                                        {log.event}
                                                                                    </Badge>
                                                                                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                                                                                        <Clock size={10} /> {new Date(log.timestamp).toLocaleString()}
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-xs text-slate-300 leading-relaxed">{log.description}</p>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                        <Button size="sm" variant="outline" className="text-xs border-slate-800 hover:bg-slate-800 text-indigo-400 h-9" onClick={() => handleGenerateOnboarding(p.id)}>
                                                            <LinkIcon size={14} className="mr-1.5" /> Lien Onboarding
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="text-xs text-slate-500 hover:text-white h-9" onClick={() => router.push('/app/settings/integrations')}>
                                                            Paramètres
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* PARTNER API DOCS */}
                            <Card className="bg-slate-900 border-slate-800 text-slate-100 mt-6">
                                <CardHeader>
                                    <CardTitle className="text-sm uppercase tracking-widest text-indigo-400 font-black flex items-center gap-2">
                                        <Globe size={16} /> Documentation API Bulk
                                    </CardTitle>
                                    <CardDescription>
                                        Endpoint pour l'envoi de leads par lots (réservé aux partenaires).
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-300">Endpoint URL</span>
                                                <Badge variant="outline" className="text-[10px] font-mono border-slate-800">{origin}/api/v1/leads/bulk</Badge>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-300">Auth Header</span>
                                                <Badge variant="outline" className="text-[10px] font-mono border-indigo-500/20 text-indigo-400">X-API-Key: [Clé Partenaire]</Badge>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                                            <p className="text-xs font-bold text-slate-400 mb-3 uppercase flex items-center gap-2">
                                                <Info size={14} className="text-indigo-400" />
                                                Format de requête (POST)
                                            </p>
                                            <pre className="text-[11px] text-emerald-400 font-mono leading-relaxed">
                                                {`{
  "leads": [
    {
      "first_name": "Jean",
      "last_name": "Partenaire",
      "email": "jean@partner.com",
      "phone": "+336...",
      "branch_id": 3,      // Facultatif (ID Direction)
      "examen_id": 12,    // Facultatif (ID Certification)
      "source": "PARTNER",
      "date_reponse": "2024-01-10T14:30:00Z"
    }
  ]
}`}
                                            </pre>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card className="bg-slate-900 border-slate-800 text-slate-100">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 italic">
                                        <Info size={16} className="text-indigo-400" />
                                        Onboarding Partenaire
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6 text-sm text-slate-400">
                                    <div className="space-y-2">
                                        <p className="text-slate-200 font-bold">Processus de connexion :</p>
                                        <ul className="list-decimal list-inside space-y-3 pl-1 leading-relaxed">
                                            <li>Générez un <strong>Lien Onboarding</strong> pour votre partenaire.</li>
                                            <li>Le partenaire renseigne ses <strong>infos légales</strong> sur un portail dédié.</li>
                                            <li>Il signe électroniquement le <strong>DPA (RGPD)</strong>.</li>
                                            <li>Ses accès API sont alors <strong>débloqués automatiquement</strong>.</li>
                                        </ul>
                                    </div>
                                    <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
                                        <p className="text-[11px] text-indigo-300 italic">Ce workflow garantit que chaque lead collecté est auditable et conforme aux règles de protection des données.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* STRIPE AUTOMATION */}
                <TabsContent value="stripe" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <Card className="bg-slate-900 border-slate-800 text-slate-100 border-l-4 border-l-indigo-500">
                                <CardHeader>
                                    <CardTitle className="text-sm uppercase tracking-widest text-indigo-400 font-black">Webhook de Paiement Stripe</CardTitle>
                                    <CardDescription className="text-slate-500 mt-1">Automatisez votre gestion financière et votre Wallet.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center gap-6 p-6 bg-slate-950 rounded-2xl border border-slate-800">
                                        <div className="h-16 w-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20">
                                            <CreditCard size={32} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-bold text-slate-100">Cycle de vie Webhook :</p>
                                            <p className="text-xs text-slate-500 italic">Session de paiement terminée ➔ Crédit Wallet ➔ Facture payée.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configuration recommandée</h4>
                                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-300">Endpoint URL</span>
                                                <Badge variant="outline" className="text-[10px] font-mono border-slate-800">{origin}/api/webhooks/stripe</Badge>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-300">Événement requis</span>
                                                <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/20 text-emerald-400">checkout.session.completed</Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-indigo-600/10 border border-indigo-600/20 p-4 rounded-xl flex gap-4">
                                        <AlertCircle className="text-indigo-400 shrink-0" />
                                        <p className="text-xs text-indigo-300 leading-relaxed font-medium">
                                            Assurez-vous d'avoir configuré le <strong>Secret de Webhook Stripe</strong> dans les paramètres d'intégration pour permettre la validation de signature sécurisée.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card className="bg-slate-900 border-slate-800 text-slate-100">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold">Documentation FAQ</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-xs text-slate-400 leading-relaxed">
                                    <div>
                                        <p className="text-slate-200 font-bold mb-1">Comment recharger mon Wallet ?</p>
                                        <p>Utilisez le bouton "Recharger" dans Facturation. Stripe enverra alors un signal à notre webhook pour créditer votre compte instantanément.</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-200 font-bold mb-1">Le webhook est-il sécurisé ?</p>
                                        <p>Oui. Chaque requête est signée avec une clé secrète. Nous rejetons toute requête non authentifiée ou falsifiée.</p>
                                    </div>
                                    <Button variant="ghost" className="w-full text-indigo-400 hover:text-indigo-300 text-[10px] uppercase font-black" onClick={() => router.push('/app/settings/billing')}>
                                        Aller à la Facturation
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* CSV IMPORT */}
                <TabsContent value="csv" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <Card className="bg-slate-900 border-slate-800 text-slate-100">
                                <CardHeader>
                                    <CardTitle className="text-sm uppercase tracking-widest text-indigo-400 font-black">Import de Fichiers Prospects</CardTitle>
                                    <CardDescription className="text-slate-500 mt-1">L'outil d'injection manuelle pour vos bases de données froides.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center py-16 space-y-6">
                                    <div className="relative">
                                        <div className="h-24 w-24 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-500 animate-pulse">
                                            <FileSpreadsheet size={48} />
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white h-8 w-8 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-xl">
                                            <Plus size={16} />
                                        </div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-lg font-black italic">PRÊT À INJECTER ?</h3>
                                        <p className="text-sm text-slate-500 max-w-sm mx-auto">
                                            Formats supportés : <strong>.csv, .xlsx</strong>. Pensez à mapper la colonne "Source" pour segmenter votre performance.
                                        </p>
                                    </div>
                                    <Button className="bg-indigo-600 hover:bg-indigo-700 font-bold h-12 px-10 shadow-lg shadow-indigo-600/20" onClick={() => router.push('/app/leads/import')}>
                                        Lancer l'Outil d'Import
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card className="bg-slate-900 border-slate-800 text-slate-100">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                        Checklist CSV
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-xs text-slate-400">
                                    <div className="flex gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
                                        <p><span className="text-slate-200">En-têtes</span> : Assurez-vous que la première ligne contient les noms des colonnes.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
                                        <p><span className="text-slate-200">Doublons</span> : Le système détecte automatiquement les emails/téléphones déjà existants.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
                                        <p><span className="text-slate-200">Format Tel</span> : Utilisez le format international (+33...) pour une meilleure compatibilité SMS.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
