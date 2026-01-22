'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/application/store/auth-store';
import { getAllUsersAction, createUserWithAccessesAction } from '@/application/actions/user.actions';
import { getAccessTemplatesAction, createAccessTemplateAction, applyTemplateToUserAction } from '@/application/actions/access-template.actions';
import { getAllOrganisations } from '@/actions/super-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Users, Plus, Search, ShieldCheck, Building2, Globe, LayoutGrid,
    Check, ChevronRight, Sparkles, UserPlus, Briefcase, X, AlertTriangle
} from 'lucide-react';

interface OrgAccess {
    orgId: string;
    roleId: string;
    agencyIds: string[] | 'ALL';
}

interface UserFormData {
    email: string;
    firstName: string;
    lastName: string;
    accesses: OrgAccess[];
}

export default function SuperAdminUsersPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [organisations, setOrganisations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<UserFormData>({
        email: '', firstName: '', lastName: '', accesses: []
    });
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user && !(user as any).isGlobalAdmin) {
            router.push('/app/dashboard');
        } else {
            loadData();
        }
    }, [user, router]);

    const loadData = async () => {
        setIsLoading(true);
        const [usersRes, templatesRes, orgsRes] = await Promise.all([
            getAllUsersAction(),
            getAccessTemplatesAction(),
            getAllOrganisations()
        ]);

        if (usersRes.success) setUsers(usersRes.users || []);
        if (templatesRes.success) setTemplates(templatesRes.templates || []);
        if (orgsRes.success) setOrganisations(orgsRes.organisations || []);
        setIsLoading(false);
    };

    const handleAddOrgAccess = () => {
        if (organisations.length === 0) return;
        setFormData({
            ...formData,
            accesses: [...formData.accesses, { orgId: '', roleId: '', agencyIds: 'ALL' }]
        });
    };

    const handleRemoveOrgAccess = (index: number) => {
        setFormData({
            ...formData,
            accesses: formData.accesses.filter((_, i) => i !== index)
        });
    };

    const handleAccessChange = (index: number, field: keyof OrgAccess, value: string) => {
        const updated = [...formData.accesses];
        updated[index] = { ...updated[index], [field]: value };
        setFormData({ ...formData, accesses: updated });

        // If org changed, load its roles
        if (field === 'orgId' && value) {
            loadRolesForOrg(value);
        }
    };

    const handleApplyTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (template && template.config?.accesses) {
            setFormData({
                ...formData,
                accesses: template.config.accesses.map((a: any) => ({
                    orgId: a.orgId,
                    roleId: a.roleId,
                    agencyIds: a.agencyIds
                }))
            });
            setSelectedTemplate(templateId);
        }
    };

    const handleCreateUser = async () => {
        if (!formData.email || !formData.firstName || formData.accesses.length === 0) {
            setError('Veuillez remplir tous les champs obligatoires et ajouter au moins un accès.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const result = await createUserWithAccessesAction({
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            accesses: formData.accesses.filter(a => a.orgId && a.roleId)
        });

        if (result.success) {
            await loadData();
            resetModal();
        } else {
            setError(result.error || 'Erreur lors de la création');
        }
        setIsSubmitting(false);
    };

    const resetModal = () => {
        setIsCreateModalOpen(false);
        setStep(1);
        setFormData({ email: '', firstName: '', lastName: '', accesses: [] });
        setSelectedTemplate(null);
        setError(null);
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.firstName && u.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.lastName && u.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Get roles for a specific organization (from organisations with included roles)
    const [orgRoles, setOrgRoles] = useState<Record<string, any[]>>({});

    const loadRolesForOrg = async (orgId: string) => {
        if (orgRoles[orgId]) return; // Already loaded
        try {
            const { getRolesAction } = await import('@/application/actions/role.actions');
            const res = await getRolesAction(orgId);
            if (res.success) {
                setOrgRoles(prev => ({ ...prev, [orgId]: res.roles || [] }));
            }
        } catch (e) {
            console.error('Failed to load roles for org:', orgId, e);
        }
    };

    const getRolesForOrg = (orgId: string) => {
        return orgRoles[orgId] || [];
    };

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-bold animate-pulse">Chargement des utilisateurs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-[1600px] mx-auto px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Users size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">Gestion des Utilisateurs</h1>
                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Vue Centralisée Multi-OF</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            <UserPlus size={18} className="mr-2" /> Créer un utilisateur
                        </Button>
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                            <ShieldCheck size={16} className="text-emerald-500" />
                            <span className="text-xs font-bold text-slate-600">Super-Admin</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/super-admin')}>
                            <LayoutGrid size={18} className="mr-2" /> Nexus Admin
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-[1600px] mx-auto px-8 pt-8 space-y-8">
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 rounded-xl">
                                <Users className="text-indigo-600" size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900">{users.length}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase">Total Utilisateurs</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 bg-purple-50 rounded-xl">
                                <Sparkles className="text-purple-600" size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900">{templates.length}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase">Templates d'Accès</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 rounded-xl">
                                <Building2 className="text-emerald-600" size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900">{organisations.length}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase">Organisations</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 bg-amber-50 rounded-xl">
                                <Briefcase className="text-amber-600" size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900">
                                    {users.filter(u => u.accessCount > 1).length}
                                </p>
                                <p className="text-xs font-bold text-slate-400 uppercase">Multi-OF Users</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Users Table */}
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between py-6">
                        <div>
                            <CardTitle className="text-xl font-black">Annuaire Global</CardTitle>
                            <p className="text-sm text-slate-500">Tous les utilisateurs de la plateforme, tous OF confondus.</p>
                        </div>
                        <div className="relative w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <Input
                                placeholder="Rechercher par nom ou email..."
                                className="pl-10 h-11 bg-slate-50 border-slate-100 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-4">Utilisateur</th>
                                        <th className="px-6 py-4">Email</th>
                                        <th className="px-6 py-4">Accès (OF)</th>
                                        <th className="px-6 py-4">Statut</th>
                                        <th className="px-8 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50/30 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                                                        {u.firstName?.[0]}{u.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{u.firstName} {u.lastName}</p>
                                                        {u.isGlobalAdmin && (
                                                            <Badge className="bg-indigo-100 text-indigo-600 border-indigo-200 text-[9px]">
                                                                <ShieldCheck size={10} className="mr-1" /> Global Admin
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-slate-500 text-sm">{u.email}</td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-wrap gap-1">
                                                    {u.accesses?.slice(0, 3).map((a: any, i: number) => (
                                                        <Badge key={i} className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
                                                            <Building2 size={10} className="mr-1" /> {a.orgName}
                                                        </Badge>
                                                    ))}
                                                    {u.accesses?.length > 3 && (
                                                        <Badge className="bg-slate-50 text-slate-400 border-slate-100 text-[10px]">
                                                            +{u.accesses.length - 3}
                                                        </Badge>
                                                    )}
                                                    {(!u.accesses || u.accesses.length === 0) && (
                                                        <span className="text-xs text-slate-400 italic">Aucun accès</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <Badge className={u.isActive
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : 'bg-amber-50 text-amber-600 border-amber-100'
                                                }>
                                                    {u.isActive ? 'Actif' : 'Inactif'}
                                                </Badge>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <Button variant="ghost" size="sm">
                                                    Gérer <ChevronRight size={14} className="ml-1" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredUsers.length === 0 && (
                            <div className="py-20 text-center flex flex-col items-center">
                                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                                    <Search size={32} />
                                </div>
                                <p className="text-slate-500 font-medium">Aucun utilisateur trouvé.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            {/* Create User Modal (Multi-Step) */}
            <Dialog open={isCreateModalOpen} onOpenChange={(open) => { if (!open) resetModal(); }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="text-indigo-600" size={20} />
                            Créer un nouvel utilisateur
                        </DialogTitle>
                        <DialogDescription>
                            Étape {step}/3 : {step === 1 ? 'Identité' : step === 2 ? 'Accès Multi-OF' : 'Récapitulatif'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Step 1: Identity */}
                    {step === 1 && (
                        <div className="py-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700 block mb-1">Prénom *</label>
                                    <Input
                                        placeholder="Jean"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 block mb-1">Nom *</label>
                                    <Input
                                        placeholder="Dupont"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Email *</label>
                                <Input
                                    type="email"
                                    placeholder="jean.dupont@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Accesses */}
                    {step === 2 && (
                        <div className="py-4 space-y-4">
                            {/* Template Selector */}
                            {templates.length > 0 && (
                                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles size={16} className="text-purple-600" />
                                        <span className="text-sm font-bold text-purple-700">Appliquer un template</span>
                                    </div>
                                    <Select onValueChange={handleApplyTemplate} value={selectedTemplate || undefined}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Choisir un profil-type..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map(t => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.name} ({t.config?.accesses?.length || 0} OF)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Manual Access Assignment */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-700">Accès aux Organisations</span>
                                    <Button size="sm" variant="outline" onClick={handleAddOrgAccess}>
                                        <Plus size={14} className="mr-1" /> Ajouter un OF
                                    </Button>
                                </div>

                                {formData.accesses.length === 0 && (
                                    <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                        <Building2 size={32} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-sm text-slate-500">Aucun accès configuré.</p>
                                        <p className="text-xs text-slate-400">Utilisez un template ou ajoutez manuellement.</p>
                                    </div>
                                )}

                                {formData.accesses.map((access, index) => (
                                    <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Accès #{index + 1}</span>
                                            <Button size="sm" variant="ghost" onClick={() => handleRemoveOrgAccess(index)}>
                                                <X size={14} className="text-red-500" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-medium text-slate-600 block mb-1">Organisation</label>
                                                <Select
                                                    value={access.orgId}
                                                    onValueChange={(v) => handleAccessChange(index, 'orgId', v)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Choisir un OF..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {organisations.map(o => (
                                                            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-600 block mb-1">Rôle</label>
                                                <Select
                                                    value={access.roleId}
                                                    onValueChange={(v) => handleAccessChange(index, 'roleId', v)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Choisir un rôle..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {getRolesForOrg(access.orgId).map(r => (
                                                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Recap */}
                    {step === 3 && (
                        <div className="py-4 space-y-4">
                            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                        {formData.firstName?.[0]}{formData.lastName?.[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{formData.firstName} {formData.lastName}</p>
                                        <p className="text-sm text-slate-500">{formData.email}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-sm font-bold text-slate-700">Accès configurés ({formData.accesses.length})</span>
                                {formData.accesses.map((a, i) => {
                                    const org = organisations.find(o => o.id === a.orgId);
                                    return (
                                        <div key={i} className="flex items-center gap-2 bg-white border border-slate-100 rounded-lg p-3">
                                            <Check size={16} className="text-emerald-500" />
                                            <span className="font-medium text-slate-700">{org?.name || a.orgId}</span>
                                            <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] ml-auto">
                                                {a.roleId}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2 text-xs text-red-600">
                                    <AlertTriangle size={14} />
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        {step > 1 && (
                            <Button variant="outline" onClick={() => setStep(step - 1)}>
                                Précédent
                            </Button>
                        )}
                        {step < 3 ? (
                            <Button
                                onClick={() => setStep(step + 1)}
                                disabled={step === 1 && (!formData.email || !formData.firstName)}
                                className="bg-indigo-600 hover:bg-indigo-700"
                            >
                                Suivant <ChevronRight size={16} className="ml-1" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleCreateUser}
                                disabled={isSubmitting || formData.accesses.length === 0}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isSubmitting ? 'Création...' : 'Créer l\'utilisateur'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
