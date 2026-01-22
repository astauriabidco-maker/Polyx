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
import { getUsersAction } from '@/application/actions/user.actions';
import { useToast } from '@/components/ui/use-toast';
import {
    Building2, Plus, Users, MapPin, Trash2, Edit3, Link2, Unlink,
    Phone, Mail, ChevronDown, ChevronUp, Store, FileText, Calendar,
    DollarSign, AlertCircle, CheckCircle2, Clock, User, Zap
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface FranchisesSettingsPageProps {
    view?: 'lab' | 'parc';
}

export default function FranchisesSettingsPage({ view = 'parc' }: FranchisesSettingsPageProps) {
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
    const [assignees, setAssignees] = useState<any[]>([]);

    useEffect(() => {
        if (activeOrganization?.id) {
            loadData();
        }
    }, [activeOrganization?.id, view]);

    async function loadData() {
        setIsLoading(true);
        const [fRes, aRes, uRes] = await Promise.all([
            getFranchisesAction(activeOrganization!.id),
            getAgenciesAction(activeOrganization!.id),
            getUsersAction(activeOrganization!.id)
        ]);
        if (fRes.success && fRes.franchises) {
            // Filter based on view
            const allFranchises = fRes.franchises;
            if (view === 'lab') {
                setFranchises(allFranchises.filter((f: any) => ['PROSPECTION', 'DIP', 'SIGNATURE', 'PENDING'].includes(f.pipelineStage)));
            } else {
                setFranchises(allFranchises.filter((f: any) => f.pipelineStage === 'ACTIF' || !f.pipelineStage));
            }
        }
        if (aRes.success && aRes.agencies) setAllAgencies(aRes.agencies);
        if (uRes.success && uRes.users) setAssignees(uRes.users);
        setIsLoading(false);
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
            contractStatus: formData.get('contractStatus') as string,
            contractStartDate: formData.get('contractStartDate') ? new Date(formData.get('contractStartDate') as string) : null,
            contractEndDate: formData.get('contractEndDate') ? new Date(formData.get('contractEndDate') as string) : null,
            signatureDate: formData.get('signatureDate') ? new Date(formData.get('signatureDate') as string) : null,
            dipSentDate: formData.get('dipSentDate') ? new Date(formData.get('dipSentDate') as string) : null,
            royaltyRate: parseFloat(formData.get('royaltyRate') as string) || 0,
            leadPrice: parseFloat(formData.get('leadPrice') as string) || 0,
            pipelineStage: formData.get('pipelineStage') as string,
            assignedToId: formData.get('assignedToId') as string,
            notes: formData.get('notes') as string,
        };

        const res = await createFranchiseAction(data);

        if (res.success) {
            toast({ title: "Dossier créé", description: `${data.name} a été ajouté au pipeline.` });
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
            contractStatus: formData.get('contractStatus') as string,
            contractStartDate: formData.get('contractStartDate') ? new Date(formData.get('contractStartDate') as string) : null,
            contractEndDate: formData.get('contractEndDate') ? new Date(formData.get('contractEndDate') as string) : null,
            signatureDate: formData.get('signatureDate') ? new Date(formData.get('signatureDate') as string) : null,
            dipSentDate: formData.get('dipSentDate') ? new Date(formData.get('dipSentDate') as string) : null,
            royaltyRate: parseFloat(formData.get('royaltyRate') as string) || 0,
            leadPrice: parseFloat(formData.get('leadPrice') as string) || 0,
            pipelineStage: formData.get('pipelineStage') as string,
            assignedToId: formData.get('assignedToId') as string,
            notes: formData.get('notes') as string,
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

    const getStageBadge = (stage: string) => {
        switch (stage) {
            case 'PROSPECTION': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Prospection</Badge>;
            case 'DIP': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">DIP Envoyé</Badge>;
            case 'SIGNATURE': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Signature en cours</Badge>;
            case 'ACTIF': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Validé & Actif</Badge>;
            case 'PENDING': return <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">Dossier Incomplet</Badge>;
            default: return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Nouveau</Badge>;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-purple-600 mb-1">
                        {view === 'lab' ? <Zap size={20} className="text-amber-500" /> : <Building2 size={20} />}
                        <span className="text-sm font-bold uppercase tracking-widest">
                            {view === 'lab' ? "Pipeline de Recrutement (LAB)" : "Annuaire du Réseau (PARC)"}
                        </span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        {view === 'lab' ? "Pilotage de la Croissance" : "Gestion du Patrimoine Réseau"}
                    </h1>
                    <p className="text-slate-500 mt-1 max-w-2xl text-sm">
                        {view === 'lab'
                            ? "Suivez vos prospects, les signatures de contrats et la performance de vos commerciaux recruteurs."
                            : "Gérez les franchises actives, leurs contrats et l'ancrage territorial de vos partenaires."}
                    </p>
                </div>
                <Button
                    onClick={() => { setEditingFranchise(null); setIsFranchiseModalOpen(true); }}
                    className="bg-purple-600 hover:bg-purple-700 h-11 px-6 font-bold shadow-lg shadow-purple-100"
                >
                    <Plus size={20} className="mr-2" /> {view === 'lab' ? "Nouveau Prospect" : "Nouvelle Franchise"}
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {view === 'lab' ? (
                    <>
                        <Card className="bg-blue-50/30 border-blue-100">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-blue-700">{franchises.filter(f => f.pipelineStage === 'PROSPECTION').length}</p>
                                    <p className="text-[10px] font-bold text-blue-500 uppercase">En Prospection</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-amber-50/30 border-amber-100">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-amber-700">{franchises.filter(f => f.pipelineStage === 'DIP').length}</p>
                                    <p className="text-[10px] font-bold text-amber-500 uppercase">DIP Envoyés</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-purple-50/30 border-purple-100">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                                    <Edit3 size={20} />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-purple-700">{franchises.filter(f => f.pipelineStage === 'SIGNATURE').length}</p>
                                    <p className="text-[10px] font-bold text-purple-500 uppercase">En Signature</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-emerald-50/30 border-emerald-100">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-emerald-700">{franchises.filter(f => f.pipelineStage === 'ACTIF').length}</p>
                                    <p className="text-[10px] font-bold text-emerald-500 uppercase">Dossiers validés</p>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <>
                        <Card className="bg-purple-50/30 border-purple-100">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-purple-700">{franchises.length}</p>
                                    <p className="text-[10px] font-bold text-purple-500 uppercase">Franchises Actives</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-indigo-50/30 border-indigo-100">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                                    <Store size={20} />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-indigo-700">
                                        {franchises.reduce((sum, f) => sum + (f.agencies?.length || 0), 0)}
                                    </p>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase">Agences Déployées</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50/30 border-slate-200">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-slate-700">{unassignedAgencies.length}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Ciblage (Agences OF)</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-amber-50/30 border-amber-100">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-amber-700">
                                        {franchises.filter(f => !f.dipSentDate && f.pipelineStage !== 'ACTIF').length}
                                    </p>
                                    <p className="text-[10px] font-bold text-amber-500 uppercase">Dossiers Incomplets</p>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {/* Franchises List */}
            <div className="space-y-4">
                {franchises.length > 0 ? (
                    franchises.map((franchise) => (
                        <Card key={franchise.id} className="border-slate-200 overflow-hidden hover:border-purple-200 transition-colors group">
                            <div className="p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                            <Building2 size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-bold text-slate-900">{franchise.name}</h3>
                                                {getStageBadge(franchise.pipelineStage)}
                                            </div>
                                            <div className="flex items-center gap-4 mt-1">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    <User size={12} className="text-slate-400" />
                                                    <span className="font-medium">
                                                        {franchise.assignedTo ? `${franchise.assignedTo.firstName} ${franchise.assignedTo.lastName}` : "Non assigné"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <MapPin size={12} className="text-slate-400" />
                                                    {franchise.city || "Ville non renseignée"}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <Store size={12} className="text-slate-400" />
                                                    {franchise.agencies?.length || 0} agences
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setExpandedFranchise(expandedFranchise === franchise.id ? null : franchise.id)}
                                    >
                                        {expandedFranchise === franchise.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </Button>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedFranchise === franchise.id && (
                                <div className="border-t border-slate-100 p-5 bg-slate-50/30 space-y-4">
                                    {/* Contract and Financial Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Contract Details */}
                                        <div className="p-4 bg-white rounded-xl border border-slate-100 space-y-3">
                                            <h4 className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                                                <FileText size={16} className="text-indigo-500" /> Pilotage du Contrat
                                            </h4>
                                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                                <span className="text-slate-500">Début de contrat:</span>
                                                <span className="font-medium text-slate-700">{franchise.contractStartDate ? new Date(franchise.contractStartDate).toLocaleDateString() : 'Non définie'}</span>

                                                <span className="text-slate-500">Fin de contrat:</span>
                                                <span className="font-medium text-slate-700">{franchise.contractEndDate ? new Date(franchise.contractEndDate).toLocaleDateString() : 'Non définie'}</span>

                                                <span className="text-slate-500">Date Signature:</span>
                                                <span className="font-medium text-slate-700">{franchise.signatureDate ? new Date(franchise.signatureDate).toLocaleDateString() : 'Non signée'}</span>

                                                <span className="text-slate-500">Envoi DIP:</span>
                                                <span className="font-medium text-slate-700">{franchise.dipSentDate ? new Date(franchise.dipSentDate).toLocaleDateString() : 'Non envoyé'}</span>
                                            </div>
                                        </div>

                                        {/* Financial Terms */}
                                        <div className="p-4 bg-white rounded-xl border border-slate-100 space-y-3">
                                            <h4 className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                                                <DollarSign size={16} className="text-emerald-500" /> Conditions Financières
                                            </h4>
                                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                                <span className="text-slate-500">Redevance (Royalties):</span>
                                                <span className="font-bold text-emerald-600">{franchise.royaltyRate || 0}% du CA</span>

                                                <span className="text-slate-500">Prix du Lead:</span>
                                                <span className="font-bold text-emerald-600">{franchise.leadPrice || 0}€ HT</span>
                                            </div>
                                            {franchise.notes && (
                                                <div className="mt-2 pt-2 border-t border-slate-50">
                                                    <p className="text-[11px] text-slate-400 italic leading-tight">{franchise.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Contact Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/50">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Users size={16} className="text-indigo-400" />
                                            <span className="text-slate-500">Responsable:</span>
                                            <span className="font-medium text-slate-700">{franchise.managerName || 'Non défini'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail size={16} className="text-indigo-400" />
                                            <span className="text-slate-700">{franchise.email || 'Pas d\'email'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone size={16} className="text-indigo-400" />
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
                    ))
                ) : (
                    <div className="py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center text-center px-6">
                        <div className="h-20 w-20 bg-purple-50 rounded-full flex items-center justify-center text-purple-300 mb-6 border border-purple-100">
                            <Building2 size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                            {view === 'lab' ? "Aucun prospect en cours" : "Aucune franchise configurée"}
                        </h3>
                        <p className="text-slate-500 max-w-sm mb-8 leading-relaxed">
                            {view === 'lab'
                                ? "Votre pipeline de recrutement est vide. Commencez à ajouter des prospects pour piloter votre expansion."
                                : "Créez votre première franchise pour commencer à structurer votre réseau de partenaires."}
                        </p>
                        <Button
                            onClick={() => setIsFranchiseModalOpen(true)}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            <Plus size={20} className="mr-2" /> {view === 'lab' ? "Ajouter un prospect" : "Créer une franchise"}
                        </Button>
                    </div>
                )}
            </div>

            {/* Franchise Create/Edit Modal */}
            <Modal
                isOpen={isFranchiseModalOpen}
                onClose={() => { setIsFranchiseModalOpen(false); setEditingFranchise(null); }}
                title={editingFranchise ? "Modifier la franchise" : (view === 'lab' ? "Ajouter un Prospect" : "Nouvelle Franchise")}
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
                        <label className="text-sm font-bold text-slate-700">Pilotage du Recrutement</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Étape Pipeline</label>
                                <Select name="pipelineStage" defaultValue={editingFranchise?.pipelineStage || "PROSPECTION"}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PROSPECTION">Prospection active</SelectItem>
                                        <SelectItem value="DIP">DIP Envoyé</SelectItem>
                                        <SelectItem value="SIGNATURE">Signature encours</SelectItem>
                                        <SelectItem value="ACTIF">Validé & Actif</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Commercial Assigné</label>
                                <Select name="assignedToId" defaultValue={editingFranchise?.assignedToId || ""}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Choisir..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Non assigné</SelectItem>
                                        {assignees.map(user => (
                                            <SelectItem key={user.id} value={user.id}>
                                                {user.firstName} {user.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

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
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FileText size={16} className="text-indigo-500" /> Pilotage du Contrat
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Statut Contrat</label>
                                <Select name="contractStatus" defaultValue={editingFranchise?.contractStatus || "PENDING"}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PENDING">En attente (Prospect)</SelectItem>
                                        <SelectItem value="ACTIVE">Actif (Signé)</SelectItem>
                                        <SelectItem value="EXPIRED">Expiré</SelectItem>
                                        <SelectItem value="TERMINATED">Résilier</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Date Signature</label>
                                <Input
                                    name="signatureDate"
                                    type="date"
                                    className="h-9"
                                    defaultValue={editingFranchise?.signatureDate ? new Date(editingFranchise.signatureDate).toISOString().split('T')[0] : ''}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Date Début</label>
                                <Input
                                    name="contractStartDate"
                                    type="date"
                                    className="h-9"
                                    defaultValue={editingFranchise?.contractStartDate ? new Date(editingFranchise.contractStartDate).toISOString().split('T')[0] : ''}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Date Fin</label>
                                <Input
                                    name="contractEndDate"
                                    type="date"
                                    className="h-9"
                                    defaultValue={editingFranchise?.contractEndDate ? new Date(editingFranchise.contractEndDate).toISOString().split('T')[0] : ''}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Date d'envoi DIP</label>
                            <Input
                                name="dipSentDate"
                                type="date"
                                className="h-9"
                                defaultValue={editingFranchise?.dipSentDate ? new Date(editingFranchise.dipSentDate).toISOString().split('T')[0] : ''}
                            />
                        </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-100">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <DollarSign size={16} className="text-emerald-500" /> Conditions Financières
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Royalties (%)</label>
                                <Input
                                    name="royaltyRate"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    placeholder="ex: 5.0"
                                    className="h-9"
                                    defaultValue={editingFranchise?.royaltyRate}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Prix du Lead (€)</label>
                                <Input
                                    name="leadPrice"
                                    type="number"
                                    step="1"
                                    min="0"
                                    placeholder="ex: 80"
                                    className="h-9"
                                    defaultValue={editingFranchise?.leadPrice}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-100">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <AlertCircle size={16} className="text-slate-400" /> Notes Internes
                        </label>
                        <Textarea
                            name="notes"
                            placeholder="Observations, conditions particulières..."
                            className="min-h-[80px]"
                            defaultValue={editingFranchise?.notes}
                        />
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
