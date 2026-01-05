'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import {
    getFranchisesAction,
    createFranchiseAction,
    updateFranchiseAction,
    deleteFranchiseAction,
    assignAgencyToFranchiseAction
} from '@/application/actions/franchise.actions';
import { getAgenciesAction } from '@/application/actions/agency.actions';
import { useToast } from '@/components/ui/use-toast';
import {
    Building2, Plus, Users, MapPin, Trash2, Edit3, Link2, Unlink,
    Phone, Mail, ChevronDown, ChevronUp, Store
} from 'lucide-react';

export default function FranchisesSettingsPage() {
    const { activeOrganization, activeMembership } = useAuthStore();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isFranchiseModalOpen, setIsFranchiseModalOpen] = useState(false);
    const [isAgencyLinkModalOpen, setIsAgencyLinkModalOpen] = useState(false);
    const [editingFranchise, setEditingFranchise] = useState<any | null>(null);
    const [selectedFranchise, setSelectedFranchise] = useState<any | null>(null);
    const [expandedFranchise, setExpandedFranchise] = useState<string | null>(null);
    const [franchises, setFranchises] = useState<any[]>([]);
    const [allAgencies, setAllAgencies] = useState<any[]>([]);

    useEffect(() => {
        if (activeOrganization?.id) {
            loadData();
        }
    }, [activeOrganization?.id]);

    async function loadData() {
        const [fRes, aRes] = await Promise.all([
            getFranchisesAction(activeOrganization!.id),
            getAgenciesAction(activeOrganization!.id)
        ]);
        if (fRes.success && fRes.franchises) setFranchises(fRes.franchises);
        if (aRes.success && aRes.agencies) setAllAgencies(aRes.agencies);
    }

    if (!activeOrganization || !activeMembership) return <div className="p-8 text-slate-500">Chargement...</div>;

    const unassignedAgencies = allAgencies.filter(a => !a.franchiseId);

    const handleCreateFranchise = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const form = e.currentTarget;
        const formData = new FormData(form);

        const data = {
            organisationId: activeOrganization.id,
            name: formData.get('name') as string,
            siret: formData.get('siret') as string,
            managerName: formData.get('managerName') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            street: formData.get('street') as string,
            city: formData.get('city') as string,
            zipCode: formData.get('zipCode') as string,
        };

        const res = await createFranchiseAction(data);

        if (res.success) {
            toast({ title: "Franchise créée", description: `${data.name} a été ajoutée avec succès.` });
            loadData();
            setIsFranchiseModalOpen(false);
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
        setIsLoading(false);
    };

    const handleUpdateFranchise = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingFranchise) return;
        setIsLoading(true);
        const form = e.currentTarget;
        const formData = new FormData(form);

        const data = {
            name: formData.get('name') as string,
            siret: formData.get('siret') as string,
            managerName: formData.get('managerName') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            street: formData.get('street') as string,
            city: formData.get('city') as string,
            zipCode: formData.get('zipCode') as string,
        };

        const res = await updateFranchiseAction(editingFranchise.id, data);

        if (res.success) {
            toast({ title: "Franchise modifiée", description: "Les informations ont été mises à jour." });
            loadData();
            setIsFranchiseModalOpen(false);
            setEditingFranchise(null);
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
        setIsLoading(false);
    };

    const handleDeleteFranchise = async (franchiseId: string, franchiseName: string) => {
        if (!confirm(`Voulez-vous vraiment supprimer la franchise "${franchiseName}" ?\n\nLes agences associées seront détachées mais conservées.`)) return;

        const res = await deleteFranchiseAction(franchiseId);
        if (res.success) {
            toast({ title: "Franchise supprimée", description: "Les agences ont été détachées." });
            loadData();
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
    };

    const handleAssignAgency = async (agencyId: string) => {
        if (!selectedFranchise) return;
        const res = await assignAgencyToFranchiseAction(agencyId, selectedFranchise.id);
        if (res.success) {
            toast({ title: "Agence rattachée", description: "L'agence fait maintenant partie de la franchise." });
            loadData();
        }
    };

    const handleUnassignAgency = async (agencyId: string) => {
        const res = await assignAgencyToFranchiseAction(agencyId, null);
        if (res.success) {
            toast({ title: "Agence détachée", description: "L'agence est maintenant une agence directe OF." });
            loadData();
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-purple-600 mb-1">
                        <Building2 size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest">Réseau Franchisé</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestion des Franchises</h1>
                    <p className="text-slate-500 mt-1 max-w-2xl">
                        Gérez vos franchisés partenaires et leurs agences rattachées. Les utilisateurs d'une franchise ne voient que les données de leurs agences.
                    </p>
                </div>
                <Button
                    onClick={() => { setEditingFranchise(null); setIsFranchiseModalOpen(true); }}
                    className="bg-purple-600 hover:bg-purple-700 h-11 px-6 font-bold shadow-lg shadow-purple-100"
                >
                    <Plus size={20} className="mr-2" /> Nouvelle Franchise
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-purple-700">{franchises.length}</p>
                            <p className="text-sm text-purple-500">Franchises actives</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                            <Store size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-indigo-700">
                                {franchises.reduce((sum, f) => sum + (f.agencies?.length || 0), 0)}
                            </p>
                            <p className="text-sm text-indigo-500">Agences franchisées</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-700">{unassignedAgencies.length}</p>
                            <p className="text-sm text-slate-500">Agences directes (OF)</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Franchises List */}
            <div className="space-y-4">
                {franchises.length > 0 ? franchises.map((franchise) => (
                    <Card key={franchise.id} className="border-slate-200 overflow-hidden">
                        {/* Franchise Header */}
                        <div
                            className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                            onClick={() => setExpandedFranchise(expandedFranchise === franchise.id ? null : franchise.id)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center font-bold text-lg">
                                    {franchise.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900">{franchise.name}</h3>
                                    <div className="flex items-center gap-3 text-sm text-slate-500">
                                        {franchise.siret && <span className="font-mono text-xs">{franchise.siret}</span>}
                                        {franchise.city && <span className="flex items-center gap-1"><MapPin size={12} /> {franchise.city}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                    <Store size={12} className="mr-1" /> {franchise.agencies?.length || 0} agences
                                </Badge>
                                <Badge variant="outline" className="bg-slate-50 text-slate-600">
                                    <Users size={12} className="mr-1" /> {franchise.users?.length || 0} utilisateurs
                                </Badge>
                                {expandedFranchise === franchise.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                            </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedFranchise === franchise.id && (
                            <div className="border-t border-slate-100 p-5 bg-slate-50/30 space-y-4">
                                {/* Contact Info */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Users size={16} className="text-slate-400" />
                                        <span className="text-slate-500">Responsable:</span>
                                        <span className="font-medium text-slate-700">{franchise.managerName || 'Non défini'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail size={16} className="text-slate-400" />
                                        <span className="text-slate-700">{franchise.email || 'Pas d\'email'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone size={16} className="text-slate-400" />
                                        <span className="text-slate-700">{franchise.phone || 'Pas de téléphone'}</span>
                                    </div>
                                </div>

                                {/* Agencies */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-bold text-slate-700">Agences rattachées</h4>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs"
                                            onClick={() => { setSelectedFranchise(franchise); setIsAgencyLinkModalOpen(true); }}
                                        >
                                            <Link2 size={14} className="mr-1" /> Rattacher une agence
                                        </Button>
                                    </div>
                                    {franchise.agencies && franchise.agencies.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {franchise.agencies.map((agency: any) => (
                                                <div key={agency.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <Store size={16} className="text-indigo-500" />
                                                        <div>
                                                            <p className="font-medium text-sm text-slate-800">{agency.name}</p>
                                                            <p className="text-xs text-slate-400">{agency.city}</p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                                                        onClick={() => handleUnassignAgency(agency.id)}
                                                    >
                                                        <Unlink size={14} />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400 italic">Aucune agence rattachée à cette franchise.</p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-3 border-t border-slate-100">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="font-bold"
                                        onClick={() => { setEditingFranchise(franchise); setIsFranchiseModalOpen(true); }}
                                    >
                                        <Edit3 size={14} className="mr-2" /> Modifier
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-rose-500 hover:bg-rose-50"
                                        onClick={() => handleDeleteFranchise(franchise.id, franchise.name)}
                                    >
                                        <Trash2 size={14} className="mr-2" /> Supprimer
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                )) : (
                    <div className="py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center text-center px-6">
                        <div className="h-20 w-20 bg-purple-50 rounded-full flex items-center justify-center text-purple-300 mb-6 border border-purple-100">
                            <Building2 size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Aucune franchise configurée</h3>
                        <p className="text-slate-500 max-w-sm mb-8 leading-relaxed">
                            Créez votre première franchise pour commencer à structurer votre réseau de partenaires.
                        </p>
                        <Button
                            onClick={() => setIsFranchiseModalOpen(true)}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            <Plus size={20} className="mr-2" /> Créer une franchise
                        </Button>
                    </div>
                )}
            </div>

            {/* Franchise Create/Edit Modal */}
            <Modal
                isOpen={isFranchiseModalOpen}
                onClose={() => { setIsFranchiseModalOpen(false); setEditingFranchise(null); }}
                title={editingFranchise ? "Modifier la franchise" : "Nouvelle Franchise"}
            >
                <form onSubmit={editingFranchise ? handleUpdateFranchise : handleCreateFranchise} className="space-y-4">
                    <Input
                        name="name"
                        label="Raison sociale"
                        required
                        placeholder="ex: Franchise Lyon Sud"
                        defaultValue={editingFranchise?.name}
                    />
                    <Input
                        name="siret"
                        label="SIRET"
                        placeholder="ex: 123 456 789 00012"
                        defaultValue={editingFranchise?.siret}
                    />

                    <div className="space-y-2 pt-2">
                        <label className="text-sm font-bold text-slate-700">Siège de la franchise</label>
                        <Input
                            name="street"
                            placeholder="Adresse..."
                            defaultValue={editingFranchise?.street}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                name="zipCode"
                                placeholder="Code Postal"
                                defaultValue={editingFranchise?.zipCode}
                            />
                            <Input
                                name="city"
                                placeholder="Ville"
                                defaultValue={editingFranchise?.city}
                            />
                        </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-100">
                        <label className="text-sm font-bold text-slate-700">Contact</label>
                        <Input
                            name="managerName"
                            placeholder="Nom du responsable"
                            defaultValue={editingFranchise?.managerName}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                name="phone"
                                placeholder="Téléphone"
                                defaultValue={editingFranchise?.phone}
                            />
                            <Input
                                name="email"
                                placeholder="Email"
                                defaultValue={editingFranchise?.email}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <Button type="button" variant="outline" onClick={() => { setIsFranchiseModalOpen(false); setEditingFranchise(null); }}>
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            className="bg-purple-600 hover:bg-purple-700 px-8 font-bold"
                            disabled={isLoading}
                        >
                            {editingFranchise ? 'Enregistrer' : 'Créer la franchise'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Agency Link Modal */}
            <Modal
                isOpen={isAgencyLinkModalOpen}
                onClose={() => { setIsAgencyLinkModalOpen(false); setSelectedFranchise(null); }}
                title={`Rattacher une agence à ${selectedFranchise?.name}`}
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Sélectionnez une agence non-rattachée pour l'ajouter à cette franchise.
                    </p>
                    {unassignedAgencies.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {unassignedAgencies.map(agency => (
                                <button
                                    key={agency.id}
                                    onClick={() => { handleAssignAgency(agency.id); setIsAgencyLinkModalOpen(false); }}
                                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50 rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <Store size={18} className="text-slate-400" />
                                        <div>
                                            <p className="font-medium text-slate-800">{agency.name}</p>
                                            <p className="text-xs text-slate-400">{agency.city}</p>
                                        </div>
                                    </div>
                                    <Link2 size={16} className="text-indigo-500" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-slate-400">
                            <p>Toutes les agences sont déjà rattachées à une franchise.</p>
                        </div>
                    )}
                    <div className="pt-4 border-t border-slate-100">
                        <Button variant="outline" className="w-full" onClick={() => setIsAgencyLinkModalOpen(false)}>
                            Fermer
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
