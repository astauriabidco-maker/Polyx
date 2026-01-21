'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { getFranchisesAction, createFranchiseAction, updateFranchiseAction, deleteFranchiseAction } from '@/application/actions/franchise.actions';
import { getAgenciesAction } from '@/application/actions/agency.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Network, Plus, Building2, MapPin, Edit, Trash2, Users, AlertTriangle, Search } from 'lucide-react';

export default function FranchisesPage() {
    const { activeOrganization } = useAuthStore();
    const [franchises, setFranchises] = useState<any[]>([]);
    const [agencies, setAgencies] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFranchise, setEditingFranchise] = useState<any | null>(null);
    const [formData, setFormData] = useState({ name: '', code: '', address: '', city: '', postalCode: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Delete Modal
    const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (activeOrganization) {
            loadData();
        }
    }, [activeOrganization]);

    const loadData = async () => {
        if (!activeOrganization) return;
        setIsLoading(true);
        try {
            const [franchisesRes, agenciesRes] = await Promise.all([
                getFranchisesAction(activeOrganization.id),
                getAgenciesAction(activeOrganization.id)
            ]);
            if (franchisesRes.success) setFranchises(franchisesRes.franchises || []);
            if (agenciesRes.success) setAgencies(agenciesRes.agencies || []);
        } catch (err) {
            console.error('Load error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingFranchise(null);
        setFormData({ name: '', code: '', address: '', city: '', postalCode: '' });
        setError(null);
        setIsModalOpen(true);
    };

    const openEditModal = (franchise: any) => {
        setEditingFranchise(franchise);
        setFormData({
            name: franchise.name || '',
            code: franchise.code || '',
            address: franchise.address || '',
            city: franchise.city || '',
            postalCode: franchise.postalCode || ''
        });
        setError(null);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            setError('Le nom de la franchise est requis.');
            return;
        }
        if (!activeOrganization) return;

        setIsSaving(true);
        setError(null);

        try {
            let result;
            if (editingFranchise) {
                result = await updateFranchiseAction(editingFranchise.id, formData);
            } else {
                result = await createFranchiseAction(activeOrganization.id, formData);
            }

            if (result.success) {
                await loadData();
                setIsModalOpen(false);
            } else {
                setError(result.error || 'Une erreur est survenue');
            }
        } catch (err) {
            setError('Erreur inattendue');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setIsDeleting(true);
        try {
            const result = await deleteFranchiseAction(deleteConfirm.id);
            if (result.success) {
                await loadData();
                setDeleteConfirm(null);
            }
        } catch (err) {
            console.error('Delete error:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredFranchises = franchises.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.code && f.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.city && f.city.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getAgenciesForFranchise = (franchiseId: string) => {
        return agencies.filter(a => a.franchiseId === franchiseId);
    };

    if (!activeOrganization) {
        return (
            <div className="p-8 text-center text-slate-500">
                Sélectionnez une organisation pour gérer les franchises.
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                        <Network size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestion des Franchises</h1>
                        <p className="text-sm text-slate-500">Gérez votre réseau de franchises et leurs agences rattachées</p>
                    </div>
                </div>

                <Button
                    onClick={openCreateModal}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
                >
                    <Plus size={18} className="mr-2" /> Nouvelle Franchise
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                    placeholder="Rechercher par nom, code ou ville..."
                    className="pl-10 h-11 bg-white border-slate-200 rounded-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Franchises Grid */}
            {isLoading ? (
                <div className="py-20 text-center">
                    <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500">Chargement...</p>
                </div>
            ) : filteredFranchises.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-16 text-center">
                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Network size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Aucune franchise</h3>
                        <p className="text-slate-500 mb-6">Créez votre première franchise pour structurer votre réseau.</p>
                        <Button onClick={openCreateModal} className="bg-emerald-600 hover:bg-emerald-700">
                            <Plus size={18} className="mr-2" /> Créer une franchise
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFranchises.map(franchise => {
                        const franchiseAgencies = getAgenciesForFranchise(franchise.id);
                        return (
                            <Card key={franchise.id} className="border-slate-200 shadow-sm hover:shadow-md transition-all group">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg font-bold">{franchise.name}</CardTitle>
                                                {franchise.code && (
                                                    <Badge variant="outline" className="text-[10px] font-mono">{franchise.code}</Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="sm" onClick={() => openEditModal(franchise)}>
                                                <Edit size={14} />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteConfirm(franchise)}>
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    {franchise.city && (
                                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                                            <MapPin size={14} />
                                            {franchise.city} {franchise.postalCode && `(${franchise.postalCode})`}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Users size={14} className="text-slate-400" />
                                            <span className="font-bold text-slate-700">{franchiseAgencies.length}</span>
                                            <span className="text-slate-500">agence{franchiseAgencies.length > 1 ? 's' : ''}</span>
                                        </div>
                                        {franchiseAgencies.length > 0 && (
                                            <div className="flex -space-x-2">
                                                {franchiseAgencies.slice(0, 3).map(agency => (
                                                    <div key={agency.id} className="h-6 w-6 bg-slate-100 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-500" title={agency.name}>
                                                        {agency.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                ))}
                                                {franchiseAgencies.length > 3 && (
                                                    <div className="h-6 w-6 bg-slate-200 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-600">
                                                        +{franchiseAgencies.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {editingFranchise ? <Edit className="text-emerald-600" size={20} /> : <Plus className="text-emerald-600" size={20} />}
                            {editingFranchise ? 'Modifier la franchise' : 'Nouvelle franchise'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingFranchise ? 'Modifiez les informations de la franchise.' : 'Ajoutez une nouvelle franchise à votre réseau.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Nom *</label>
                            <Input
                                placeholder="Ex: Franchise Paris Nord"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Code (optionnel)</label>
                            <Input
                                placeholder="Ex: FR-PN-01"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Adresse</label>
                            <Input
                                placeholder="Ex: 123 rue de Paris"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Ville</label>
                                <Input
                                    placeholder="Ex: Paris"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Code postal</label>
                                <Input
                                    placeholder="Ex: 75001"
                                    value={formData.postalCode}
                                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2 text-xs text-red-600">
                                <AlertTriangle size={14} />
                                {error}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                            {isSaving ? 'Enregistrement...' : (editingFranchise ? 'Enregistrer' : 'Créer')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 size={20} />
                            Supprimer la franchise
                        </DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer <strong>{deleteConfirm?.name}</strong> ?
                            Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
                        <Button onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                            {isDeleting ? 'Suppression...' : 'Supprimer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
