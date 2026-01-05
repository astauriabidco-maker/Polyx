'use client';

import { useState } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Building2, ShieldCheck, Mail, Phone, Globe, Upload } from 'lucide-react';
import { PageGuide } from '@/components/ui/page-guide';

export default function OrganizationProfilePage() {
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
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
            <header className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                        <Building2 size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest">Entité Juridique</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Profil Organisation</h1>
                    <p className="text-slate-500">Gérez l'identité officielle et les éléments de branding de votre Organisme de Formation.</p>
                </div>
                <PageGuide
                    title="Profil Organisation"
                    steps={[
                        { title: "Identité Légale", description: "SIRET, NDA et statut Qualiopi sont synchronisés avec les bases administratives." },
                        { title: "Coordonnées Gestion", description: "Email et téléphone utilisés pour les communications administratives (non visibles des étudiants)." },
                        { title: "Branding", description: "Le logo et la signature sont automatiquement insérés dans vos Conventions et Devis." }
                    ]}
                />
            </header>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Informations Légales */}
                <Card className="border-slate-200">
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
                            <Input defaultValue={activeOrganization.siret} className="bg-slate-50" readOnly />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">NDA (Déclaration d'Activité)</label>
                            <Input placeholder="ex: 11 75 12345 75" defaultValue={activeOrganization.nda} />
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

                {/* Coordonnées */}
                <Card className="border-slate-200">
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
                            <Input defaultValue={activeOrganization.contact?.website} placeholder="https://..." />
                        </div>
                    </CardContent>
                </Card>

                {/* Branding */}
                <Card className="border-slate-200 overflow-hidden">
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

                <div className="flex justify-end gap-3">
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
