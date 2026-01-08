'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { getAgenciesAction, createAgencyAction, deleteAgencyAction, updateAgencyAction } from '@/application/actions/agency.actions';
import { getFranchisesAction } from '@/application/actions/franchise.actions';
import { MapPin, Plus, Building, User, Mail, Phone, Trash2, Edit3, Globe, Building2, TrendingUp, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

export default function StructureSettingsPage() {
    const { activeOrganization, activeMembership } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
    const [editingAgency, setEditingAgency] = useState<any | null>(null);
    const [agencies, setAgencies] = useState<any[]>([]);
    const [franchises, setFranchises] = useState<any[]>([]);

    useEffect(() => {
        if (activeOrganization?.id) {
            loadAgencies();
            loadFranchises();
        }
    }, [activeOrganization?.id]);

    async function loadAgencies() {
        const res = await getAgenciesAction(activeOrganization!.id);
        if (res.success && res.agencies) {
            setAgencies(res.agencies);
        }
    }

    async function loadFranchises() {
        const res = await getFranchisesAction(activeOrganization!.id);
        if (res.success && res.franchises) {
            setFranchises(res.franchises);
        }
    }

    if (!activeOrganization || !activeMembership) return <div className="p-8 text-slate-500">Chargement...</div>;

    const handleCreateAgency = async (formData: FormData) => {
        setIsLoading(true);
        const res = await createAgencyAction(activeOrganization.id, formData);

        if (res.success && res.agency) {
            loadAgencies();
            setIsAgencyModalOpen(false);
        } else {
            alert(res.error || "Erreur lors de la création de l'agence");
        }
        setIsLoading(false);
    };

    const handleUpdateAgency = async (formData: FormData) => {
        if (!editingAgency) return;
        setIsLoading(true);
        const res = await updateAgencyAction(activeOrganization.id, editingAgency.id, formData);

        if (res.success && res.agency) {
            loadAgencies();
            setIsAgencyModalOpen(false);
            setEditingAgency(null);
        } else {
            alert(res.error || "Erreur lors de la modification de l'agence");
        }
        setIsLoading(false);
    };

    const handleDeleteAgency = async (agencyId: string) => {
        if (!confirm("Voulez-vous vraiment supprimer cette agence ? Cette action est irréversible.")) return;

        const res = await deleteAgencyAction(activeOrganization.id, agencyId);
        if (res.success) {
            loadAgencies();
        } else {
            alert(res.error);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                        <MapPin size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest">Maillage Territorial</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Structure & Réseau</h1>
                    <p className="text-slate-500 mt-1 max-w-2xl">
                        Gérez vos antennes locales, points de vente et agences physiques rattachées à <span className="font-bold text-slate-700">{activeOrganization.name}</span>.
                    </p>
                </div>
                <Button
                    onClick={() => { setEditingAgency(null); setIsAgencyModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 h-11 px-6 font-bold shadow-lg shadow-indigo-100"
                >
                    <Plus size={20} className="mr-2" /> Ajouter une Agence
                </Button>
            </div>

            {/* Link to Franchises */}
            <Link href="/app/settings/franchises" className="block">
                <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-between hover:bg-purple-100/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-purple-800">Gérer les Franchises</p>
                            <p className="text-sm text-purple-500">Structurez votre réseau de franchisés et leurs agences</p>
                        </div>
                    </div>
                    <span className="text-purple-600">→</span>
                </div>
            </Link>

            {/* Agencies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agencies.length > 0 ? agencies.map((agency) => (
                    <Card key={agency.id} className="group relative border-slate-200 overflow-hidden hover:shadow-xl hover:border-indigo-200 transition-all duration-300">
                        {/* Status/Code Badge */}
                        <div className="absolute top-4 right-4 flex gap-2">
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-tight">
                                {agency.code || 'N/A'}
                            </span>
                        </div>

                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3 mb-1">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg font-bold text-slate-900">{agency.name}</CardTitle>
                                        {agency.isExamCenter && (
                                            <Badge className="bg-blue-600 text-white border-none text-[9px] h-4 uppercase font-black px-1.5">Agréé</Badge>
                                        )}
                                    </div>
                                    {agency.franchise ? (
                                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 mt-1">
                                            <Building2 size={10} className="mr-1" /> {agency.franchise.name}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-200 mt-1">
                                            Agence directe OF
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <CardDescription className="flex items-center gap-1 text-slate-400">
                                <MapPin size={12} /> {agency.city}, France
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-600 text-sm">
                                    <Mail size={14} className="text-slate-400" />
                                    <span className="truncate">{agency.email || "Pas d'email"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 text-sm">
                                    <Phone size={14} className="text-slate-400" />
                                    <span>{agency.phone || "Pas de téléphone"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold pt-2 border-t border-slate-100">
                                    <User size={14} />
                                    <span>Responsable : {agency.managerName || "Non assigné"}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 font-bold h-10 border-slate-200 text-slate-600 hover:bg-slate-50"
                                    onClick={() => {
                                        setEditingAgency(agency);
                                        setIsAgencyModalOpen(true);
                                    }}
                                >
                                    <Edit3 size={14} className="mr-2" /> Modifier
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-10 w-10 p-0 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                    onClick={() => handleDeleteAgency(agency.id)}
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )) : (
                    <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center text-center px-6">
                        <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6 border border-slate-100">
                            <Globe size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Aucune agence configurée</h3>
                        <p className="text-slate-500 max-w-sm mb-8 leading-relaxed">
                            Votre structure ne comporte pas encore d'agences physiques rattachées. Créez votre première antenne locale pour commencer l'affectation territoriale.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => setIsAgencyModalOpen(true)}
                            className="h-11 px-8 font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                            Créer ma première agence
                        </Button>
                    </div>
                )}
            </div>

            {/* Agency Modal */}
            <Modal
                isOpen={isAgencyModalOpen}
                onClose={() => { setIsAgencyModalOpen(false); setEditingAgency(null); }}
                title={editingAgency ? `Modifier l'agence` : "Nouvelle Agence"}
            >
                <form action={editingAgency ? handleUpdateAgency : handleCreateAgency} className="space-y-4">
                    <Input
                        name="name"
                        label="Nom de l'agence"
                        required
                        placeholder="ex: Agence Polyx Lyon"
                        defaultValue={editingAgency?.name}
                    />
                    <Input
                        name="code"
                        label="Code Agence"
                        required
                        placeholder="ex: LYO-01"
                        defaultValue={editingAgency?.code}
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Rattachement (Optionnel)</label>
                        <Select name="franchiseId" defaultValue={editingAgency?.franchiseId || "none"}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Choisir une franchise" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Aucune (Agence Directe OF)</SelectItem>
                                {franchises.map(f => (
                                    <SelectItem key={f.id} value={f.id}>
                                        {f.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-slate-400">Si non rattachée, l'agence est gérée directement par le siège de l'OF.</p>
                    </div>

                    <div className="space-y-2 pt-2">
                        <label className="text-sm font-bold text-slate-700">Localisation</label>
                        <Input
                            name="street"
                            placeholder="Adresse complète..."
                            required
                            defaultValue={editingAgency?.street}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                name="zipCode"
                                placeholder="Code Postal"
                                required
                                defaultValue={editingAgency?.zipCode}
                            />
                            <Input
                                name="city"
                                placeholder="Ville"
                                required
                                defaultValue={editingAgency?.city}
                            />
                        </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-100">
                        <label className="text-sm font-bold text-slate-700">Contact & Responsable</label>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                name="phone"
                                placeholder="Téléphone"
                                defaultValue={editingAgency?.phone}
                            />
                            <Input
                                name="email"
                                placeholder="Email"
                                defaultValue={editingAgency?.email}
                            />
                        </div>
                        <Input
                            name="managerName"
                            placeholder="Nom du responsable d'agence"
                            defaultValue={editingAgency?.managerName}
                        />
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                        <input
                            type="checkbox"
                            name="isExamCenter"
                            id="isExamCenter"
                            defaultChecked={editingAgency?.isExamCenter}
                            className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <label htmlFor="isExamCenter" className="text-sm font-bold text-blue-900 cursor-pointer">
                            Centre d'Examen Agréé
                            <span className="block text-[10px] text-blue-500 font-normal">Cette agence pourra être sélectionnée comme lieu d'examen.</span>
                        </label>
                    </div>

                    <div className="space-y-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} className="text-indigo-600" />
                                <label className="text-sm font-bold text-indigo-900">Distribution des Leads (Smart)</label>
                            </div>
                            <Badge variant="outline" className="text-[9px] bg-white text-indigo-600 border-indigo-200">Recommandé</Badge>
                        </div>

                        <Select name="distributionMode" defaultValue={editingAgency?.distributionMode || "ROUND_ROBIN"}>
                            <SelectTrigger className="bg-white border-indigo-200">
                                <SelectValue placeholder="Choisir un mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ROUND_ROBIN">🔄 Circulaire (Round Robin)</SelectItem>
                                <SelectItem value="LOAD_BALANCED">⚖️ Équilibrage de Charge (Libre)</SelectItem>
                                <SelectItem value="SKILL_BASED">🎯 Par Compétences (Coming Soon)</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="bg-white/60 rounded-lg p-3 border border-indigo-100/50 space-y-2">
                            <div className="flex items-start gap-2">
                                <Info size={14} className="text-indigo-500 mt-0.5" />
                                <div className="text-[11px] text-slate-600 leading-relaxed">
                                    <p className="font-bold text-indigo-900 mb-1">Guide de choix :</p>
                                    <ul className="list-disc ml-4 space-y-1">
                                        <li><span className="font-semibold">Circulaire</span> : Idéal pour les équipes où tout le monde traite le même volume. Plus "juste" mathématiquement sur une journée.</li>
                                        <li><span className="font-semibold">Équilibrage</span> : Idéal si certains agents sont plus lents ou ont déjà beaucoup de dossiers. Évite de surcharger ceux qui sont déjà occupés.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <Button type="button" variant="outline" onClick={() => { setIsAgencyModalOpen(false); setEditingAgency(null); }}>Annuler</Button>
                        <Button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 px-8 font-bold"
                            disabled={isLoading}
                        >
                            {editingAgency ? 'Enregistrer' : 'Créer l\'agence'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
