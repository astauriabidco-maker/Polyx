'use client';

import React, { useEffect, useState } from 'react';
import {
    getOrganisationGroupsAction,
    createOrganisationGroupAction,
    addOrganisationToGroupAction,
    removeOrganisationFromGroupAction,
    getOrganizationsAction
} from '@/application/actions/organization.actions';
import {
    LayoutGrid,
    Plus,
    Users,
    Building2,
    Trash2,
    Search,
    MoreVertical,
    FolderPlus,
    X,
    CheckCircle2,
    Network
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/application/store/auth-store';

import { useRouter } from 'next/navigation';

export default function GroupsPage() {
    const { user } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (user && !(user as any).isGlobalAdmin) {
            router.push('/app/dashboard');
        }
    }, [user, router]);

    const [groups, setGroups] = useState<any[]>([]);
    const [allOrgs, setAllOrgs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<any>(null); // For managing members
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);

    // Forms
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [orgToAdd, setOrgToAdd] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        const [groupsRes, orgsRes] = await Promise.all([
            getOrganisationGroupsAction(),
            getOrganizationsAction()
        ]);

        if (groupsRes.success) setGroups(groupsRes.groups || []);
        if (orgsRes.success) setAllOrgs(orgsRes.organizations || []);
        setIsLoading(false);
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || !user) return;
        setIsSubmitting(true);

        const res = await createOrganisationGroupAction({
            name: newGroupName,
            description: newGroupDesc,
            createdById: user.id
        });

        if (res.success) {
            await fetchData();
            setIsCreateModalOpen(false);
            setNewGroupName('');
            setNewGroupDesc('');
        }
        setIsSubmitting(false);
    };

    const handleAddMember = async () => {
        if (!selectedGroup || !orgToAdd) return;
        setIsSubmitting(true);

        const res = await addOrganisationToGroupAction(selectedGroup.id, orgToAdd);
        if (res.success) {
            // Update local state to avoid full reload flickering
            const updatedGroups = groups.map(g => {
                if (g.id === selectedGroup.id) {
                    const org = allOrgs.find(o => o.id === orgToAdd);
                    const newMember = {
                        organisationId: orgToAdd,
                        groupId: selectedGroup.id,
                        role: 'MEMBER',
                        organisation: org
                    };
                    return { ...g, members: [...g.members, newMember] };
                }
                return g;
            });
            setGroups(updatedGroups);

            // Also update the selected group for the modal
            const updatedSelected = updatedGroups.find(g => g.id === selectedGroup.id);
            setSelectedGroup(updatedSelected);
            setOrgToAdd('');
        }
        setIsSubmitting(false);
    };

    const handleRemoveMember = async (groupId: string, orgId: string) => {
        const res = await removeOrganisationFromGroupAction(groupId, orgId);
        if (res.success) {
            const updatedGroups = groups.map(g => {
                if (g.id === groupId) {
                    return { ...g, members: g.members.filter((m: any) => m.organisationId !== orgId) };
                }
                return g;
            });
            setGroups(updatedGroups);
            if (selectedGroup && selectedGroup.id === groupId) {
                setSelectedGroup(updatedGroups.find(g => g.id === groupId));
            }
        }
    };

    const openManageModal = (group: any) => {
        setSelectedGroup(group);
        setIsManageModalOpen(true);
    };

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter orgs that are NOT already in the selected group
    const availableOrgs = selectedGroup
        ? allOrgs.filter(o => !selectedGroup.members.some((m: any) => m.organisationId === o.id))
        : [];

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-[1600px] mx-auto px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Network size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">Réseaux de Franchise</h1>
                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Multi-OF Management</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <Input
                                placeholder="Rechercher un groupe..."
                                className="pl-10 h-10 bg-slate-50 border-slate-100 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                            <Plus size={18} className="mr-2" /> Nouveau Groupe
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-[1600px] mx-auto px-8 pt-8">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <LayoutGrid size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Aucun groupe trouvé</h3>
                        <p className="text-slate-500 mb-6">Créez votre premier regroupement d'organismes.</p>
                        <Button onClick={() => setIsCreateModalOpen(true)} variant="outline">
                            Créer un groupe
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredGroups.map(group => (
                            <Card key={group.id} className="group hover:shadow-lg transition-all duration-300 border-slate-200">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            <Building2 size={24} />
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-indigo-600" onClick={() => openManageModal(group)}>
                                            <MoreVertical size={16} />
                                        </Button>
                                    </div>
                                    <CardTitle className="text-lg font-bold text-slate-900">{group.name}</CardTitle>
                                    <CardDescription className="line-clamp-2 h-10">
                                        {group.description || 'Aucune description'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">
                                        <Users size={14} />
                                        <span className="font-semibold">{group.members?.length || 0}</span> Organismes membres
                                    </div>
                                    <div className="mt-4 flex -space-x-2 overflow-hidden">
                                        {group.members.slice(0, 5).map((m: any) => (
                                            <div key={m.id} className="h-8 w-8 rounded-full bg-white border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-600 bg-indigo-50" title={m.organisation.name}>
                                                {m.organisation.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        ))}
                                        {group.members.length > 5 && (
                                            <div className="h-8 w-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-slate-500 font-bold">
                                                +{group.members.length - 5}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-0">
                                    <Button variant="outline" className="w-full border-slate-200 hover:bg-slate-50 hover:text-indigo-600" onClick={() => openManageModal(group)}>
                                        Gérer les membres
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Group Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Créer un nouveau groupe</DialogTitle>
                        <DialogDescription>Regroupez plusieurs organismes pour une gestion centralisée.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nom du groupe</Label>
                            <Input placeholder="Ex: Master Franchise Sud" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea placeholder="Description du réseau..." value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Annuler</Button>
                        <Button onClick={handleCreateGroup} disabled={!newGroupName || isSubmitting} className="bg-indigo-600 text-white">
                            {isSubmitting ? 'Création...' : 'Créer le groupe'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage Members Modal */}
            <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Membres du groupe : {selectedGroup?.name}</DialogTitle>
                        <DialogDescription>Ajoutez ou retirez des organismes de ce groupe.</DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-4 pr-1">
                        {/* Add Member Section */}
                        <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <FolderPlus size={16} className="text-indigo-600" /> Ajouter un organisme
                            </h4>
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={orgToAdd}
                                    onChange={(e) => setOrgToAdd(e.target.value)}
                                >
                                    <option value="">Sélectionner un organisme...</option>
                                    {availableOrgs.map(org => (
                                        <option key={org.id} value={org.id}>{org.name} ({org.siret || 'Sans SIRET'})</option>
                                    ))}
                                </select>
                                <Button onClick={handleAddMember} disabled={!orgToAdd || isSubmitting} className="bg-indigo-600">
                                    <Plus size={16} />
                                </Button>
                            </div>
                        </div>

                        {/* Members List */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-700 mb-2">Organismes membres ({selectedGroup?.members?.length || 0})</h4>
                            {selectedGroup?.members?.length === 0 ? (
                                <p className="text-sm text-slate-400 italic text-center py-4">Aucun membre pour le moment.</p>
                            ) : (
                                selectedGroup?.members?.map((member: any) => (
                                    <div key={member.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-indigo-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs">
                                                {member.organisation.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{member.organisation.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs text-slate-400">{member.role}</p>
                                                    {member.organisation.status === 'ACTIVE' && <CheckCircle2 size={12} className="text-emerald-500" />}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveMember(selectedGroup.id, member.organisationId)}
                                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
