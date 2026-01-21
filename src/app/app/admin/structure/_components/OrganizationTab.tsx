'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ShieldCheck, Mail, Phone, Globe, Upload, Brain, CheckCircle, AlertTriangle, Key, Zap, RotateCcw } from 'lucide-react';
import { getAIConfigAction, updateAIConfigAction, testAIConnectionAction } from '@/application/actions/ai-settings.actions';

export function OrganizationTab() {
    const { activeOrganization } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);

    if (!activeOrganization) return <div className="p-8">Chargement...</div>;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
            alert("Profil mis à jour !");
            setIsLoading(false);
        }, 800);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <form onSubmit={handleSave} className="space-y-6">
                {/* Informations Légales */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 border border-slate-100">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <CardTitle>Identité & Certifications</CardTitle>
                                <CardDescription>Données administratives utilisées pour vos documents officiels.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Raison Sociale</label>
                            <Input defaultValue={activeOrganization.name} className="bg-slate-50" readOnly />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">SIRET</label>
                            <Input defaultValue={activeOrganization.siret || ''} className="bg-slate-50" readOnly />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">NDA (Déclaration d'Activité)</label>
                            <Input placeholder="ex: 11 75 12345 75" defaultValue={activeOrganization.nda || ''} />
                        </div>
                        <div className="flex items-center space-x-3 pt-6 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                            <input
                                type="checkbox"
                                checked={activeOrganization.qualiopi}
                                className="h-5 w-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                                readOnly
                            />
                            <div className="flex flex-col">
                                <label className="text-sm font-bold text-emerald-800">Certification Qualiopi</label>
                                <span className="text-[10px] text-emerald-600 font-semibold uppercase">Actif</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Intelligence Artificielle */}
                <Card className="border-indigo-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-200">
                                <Brain size={20} />
                            </div>
                            <div>
                                <CardTitle className="text-indigo-900">Intelligence Artificielle</CardTitle>
                                <CardDescription className="text-indigo-600/70">Analysez vos appels et générez du contenu automatiquement.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <AIConfigForm organisationId={activeOrganization.id} />
                </Card>

                {/* Coordonnées */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Contact & Siège Social</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Mail size={14} className="text-slate-400" /> Email de gestion
                                </label>
                                <Input defaultValue={activeOrganization.contact?.email} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Phone size={14} className="text-slate-400" /> Téléphone fixe
                                </label>
                                <Input defaultValue={activeOrganization.contact?.phone} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Globe size={14} className="text-slate-400" /> Site Web
                            </label>
                            <Input defaultValue={activeOrganization.contact?.website || ''} placeholder="https://..." />
                        </div>
                    </CardContent>
                </Card>

                {/* Branding */}
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <CardTitle>Branding & Signature</CardTitle>
                        <CardDescription>Ces éléments sont injectés dans vos devis et conventions.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8">
                        <BrandingBox label="Logo" sub="PNG/SVG (fond transparent)" />
                        <BrandingBox label="Cachet" sub="Image ronde recommandée" />
                        <BrandingBox label="Signature" sub="Signature du dirigeant" />
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3 pb-8">
                    <Button type="button" variant="outline">Annuler</Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8" disabled={isLoading}>
                        {isLoading ? 'Enregistrement...' : 'Sauvegarder les modifications'}
                    </Button>
                </div>
            </form>
        </div>
    );
}

function BrandingBox({ label, sub }: { label: string, sub: string }) {
    return (
        <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <div className="w-full aspect-video border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50 hover:bg-white hover:border-indigo-300 transition-all cursor-pointer group">
                <div className="h-10 w-10 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all">
                    <Upload size={18} />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">{sub}</p>
            </div>
        </div>
    );
}

function AIConfigForm({ organisationId }: { organisationId: string }) {
    const [config, setConfig] = useState({
        aiEnabled: false,
        aiProvider: 'GEMINI',
        aiModel: 'gemini-1.5-flash',
        aiApiKey: ''
    });
    const [originalKeyMasked, setOriginalKeyMasked] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);

    useEffect(() => {
        loadConfig();
    }, [organisationId]);

    const loadConfig = async () => {
        setIsLoading(true);
        const res = await getAIConfigAction(organisationId);
        if (res.success && res.config) {
            setConfig({
                aiEnabled: res.config.aiEnabled,
                aiProvider: res.config.aiProvider,
                aiModel: res.config.aiModel,
                aiApiKey: ''
            });
            setOriginalKeyMasked(res.config.aiApiKeyMasked);
        }
        setIsLoading(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const res = await updateAIConfigAction(organisationId, {
            aiEnabled: config.aiEnabled,
            aiProvider: config.aiProvider,
            aiModel: config.aiModel,
            aiApiKey: config.aiApiKey
        });

        if (res.success) {
            setOriginalKeyMasked(config.aiApiKey ? '••••••••' : originalKeyMasked);
            setConfig(prev => ({ ...prev, aiApiKey: '' }));
            alert("Configuration IA mise à jour !");
        } else {
            alert("Erreur lors de la sauvegarde.");
        }
        setIsSaving(false);
    };

    const handleTest = async () => {
        if (!originalKeyMasked && !config.aiApiKey) {
            alert("Veuillez d'abord configurer et sauvegarder une clé API.");
            return;
        }

        setIsTesting(true);
        setTestResult(null);

        // Save first if there are pending changes
        if (config.aiApiKey) {
            await handleSave();
        }

        const res = await testAIConnectionAction(organisationId);
        setTestResult({
            success: res.success,
            message: res.success ? `Connexion réussie ! Réponse: "${(res as any).response || (res as any).text}"` : `Échec: ${res.error}`
        });
        setIsTesting(false);
    };

    if (isLoading) return <div className="p-6 text-center text-slate-400">Chargement de la configuration IA...</div>;

    return (
        <CardContent className="space-y-6 pt-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        Activer l'IA Avancée
                    </label>
                    <p className="text-xs text-slate-500">Activez Gemini ou GPT-4 pour analyser vos appels.</p>
                </div>
                <Switch
                    checked={config.aiEnabled}
                    onCheckedChange={(checked) => setConfig({ ...config, aiEnabled: checked })}
                />
            </div>

            {config.aiEnabled && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Fournisseur & Modèle</label>
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 text-sm border rounded-md p-2 bg-white"
                                    value={config.aiProvider}
                                    onChange={(e) => setConfig({ ...config, aiProvider: e.target.value })}
                                >
                                    <option value="GEMINI">Google Gemini</option>
                                    <option value="OPENAI">OpenAI (GPT-4)</option>
                                </select>
                                <Input
                                    className="flex-1"
                                    placeholder="Modèle (ex: gpt-4o)"
                                    value={config.aiModel}
                                    onChange={(e) => setConfig({ ...config, aiModel: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Key size={14} className="text-slate-400" /> Clé API {config.aiProvider === 'GEMINI' ? '(Google AI Studio)' : '(OpenAI Platform)'}
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    type="password"
                                    placeholder={originalKeyMasked || "sk-..."}
                                    value={config.aiApiKey}
                                    onChange={(e) => setConfig({ ...config, aiApiKey: e.target.value })}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400">
                                {config.aiApiKey ? "Nouvelle clé saisie (sera chiffrée)" : originalKeyMasked ? "Clé configurée et masquée" : "Aucune clé configurée"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleTest}
                                disabled={isTesting || isSaving}
                                className="h-9 gap-2"
                            >
                                {isTesting ? <RotateCcw className="animate-spin" size={14} /> : <Zap size={14} className="text-amber-500" />}
                                Tester la connexion
                            </Button>
                            {testResult && (
                                <span className={`text-xs font-medium px-2 py-1 rounded ${testResult.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {testResult.success ? 'Succès' : 'Échec'}
                                </span>
                            )}
                        </div>
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-indigo-600 hover:bg-indigo-700 h-9"
                        >
                            {isSaving ? 'Enregistrement...' : 'Sauvegarder la configuration'}
                        </Button>
                    </div>

                    {testResult && !testResult.success && (
                        <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-100 flex items-start gap-2">
                            <AlertTriangle size={14} className="mt-0.5" />
                            <div>{testResult.message}</div>
                        </div>
                    )}
                    {testResult && testResult.success && (
                        <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-100 flex items-start gap-2">
                            <CheckCircle size={14} className="mt-0.5" />
                            <div>{testResult.message}</div>
                        </div>
                    )}
                </div>
            )}
        </CardContent>
    );
}
