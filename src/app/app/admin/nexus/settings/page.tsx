'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getPlatformConfigAction, updatePlatformConfigAction, PlatformConfigData } from '@/application/actions/platform.actions';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Fingerprint, Globe, Mail, Building } from 'lucide-react';

export default function PlatformSettingsPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [config, setConfig] = useState<PlatformConfigData | null>(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    async function loadConfig() {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const res = await getPlatformConfigAction();
            if (res.success && res.data) {
                setConfig(res.data as PlatformConfigData);
            } else {
                console.error("Load Config Error:", res.error);
                setErrorMsg(res.error || "Erreur inconnue");
            }
        } catch (e) {
            console.error("Load Config Exception:", e);
            setErrorMsg("Erreur de communication serveur");
        }
        setIsLoading(false);
    }

    // ...

    // If loading finished but no config, show error/empty state instead of white screen
    if (!config) {
        return (
            <div className="p-12 text-center">
                <h2 className="text-xl font-semibold text-slate-900">Configuration introuvable</h2>
                <p className="text-slate-500 mb-4">Impossible de charger la configuration de la plateforme.</p>
                {errorMsg && (
                    <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm font-mono max-w-lg mx-auto">
                        Details: {errorMsg}
                    </div>
                )}
                <Button onClick={loadConfig} variant="outline">Réessayer</Button>
            </div>
        );
    }

    async function handleSave() {
        if (!config) return;
        setIsSaving(true);
        const res = await updatePlatformConfigAction(config);
        if (res.success) {
            toast({ title: "Succès", description: "Configuration mise à jour" });
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
        setIsSaving(false);
    }

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>;

    // If loading finished but no config, show error/empty state instead of white screen
    if (!config) {
        return (
            <div className="p-12 text-center">
                <h2 className="text-xl font-semibold text-slate-900">Configuration introuvable</h2>
                <p className="text-slate-500 mb-4">Impossible de charger la configuration de la plateforme.</p>
                <Button onClick={loadConfig} variant="outline">Réessayer</Button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Identité Plateforme</h1>
                    <p className="text-slate-500">Personnalisez l'apparence et les informations légales de votre instance Polyx</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                    {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                    Enregistrer
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Branding */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Fingerprint className="h-5 w-5 text-indigo-500" /> Marque & Apparence</CardTitle>
                        <CardDescription>Visible dans la sidebar et le navigateur</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nom de la Plateforme</label>
                            <Input
                                value={config.platformName}
                                onChange={e => setConfig({ ...config, platformName: e.target.value })}
                                placeholder="Polyx"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Texte du Pied de Page (Footer)</label>
                            <Input
                                value={config.footerText || ''}
                                onChange={e => setConfig({ ...config, footerText: e.target.value })}
                                placeholder="Powered by Polyx"
                            />
                            <p className="text-xs text-slate-400">Apparaît en bas du menu et dans les emails</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description (Meta tag)</label>
                            <Input
                                value={config.description || ''}
                                onChange={e => setConfig({ ...config, description: e.target.value })}
                                placeholder="Plateforme de gestion..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Legal & Support */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-blue-500" /> Légal & Support</CardTitle>
                        <CardDescription>Informations administratives</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Raison Sociale</label>
                            <Input
                                value={config.legalName || ''}
                                onChange={e => setConfig({ ...config, legalName: e.target.value })}
                                placeholder="Acme Corp SAS"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Adresse Siège</label>
                            <Input
                                value={config.legalAddress || ''}
                                onChange={e => setConfig({ ...config, legalAddress: e.target.value })}
                                placeholder="123 Rue de la Innovation, 75000 Paris"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email Support</label>
                            <Input
                                value={config.supportEmail || ''}
                                onChange={e => setConfig({ ...config, supportEmail: e.target.value })}
                                placeholder="support@acme.com"
                            />
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
