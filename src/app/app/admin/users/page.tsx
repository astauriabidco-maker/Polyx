'use client';

import { useEffect, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/application/store/auth-store';
import { getUsersAction, inviteUserAction, updateUserAction } from '@/application/actions/user.actions';
import { getRolesAction } from '@/application/actions/role.actions';
import { getAgenciesAction } from '@/application/actions/agency.actions';
import { getFranchisesAction } from '@/application/actions/franchise.actions';
import { User } from '@/domain/entities/user';
import { RoleDefinition } from '@/domain/entities/permission';
import { PageGuide } from '@/components/ui/page-guide';
import { Building2, Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function UsersPage(props: { hideHeader?: boolean }) {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Chargement des utilisateurs...</div>}>
            <UsersContent {...props} />
        </Suspense>
    );
}

function UsersContent({ hideHeader = false }: { hideHeader?: boolean }) {
    const { activeOrganization } = useAuthStore();
    const searchParams = useSearchParams();
    const [users, setUsers] = useState<User[]>([]);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Dynamic Roles, Agencies & Franchises
    const [availableRoles, setAvailableRoles] = useState<RoleDefinition[]>([]);
    const [availableAgencies, setAvailableAgencies] = useState<any[]>([]);
    const [availableFranchises, setAvailableFranchises] = useState<any[]>([]);

    // Loading State (simplified)
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (activeOrganization) {
            loadUsers();
            loadRoles();
            loadAgencies();
            loadFranchises();
        }
    }, [activeOrganization]);

    // Check for ?new=true to auto-open modal
    useEffect(() => {
        if (searchParams.get('new') === 'true' && !isLoading) {
            setIsInviteModalOpen(true);
        }
    }, [searchParams, isLoading]);

    const loadRoles = async () => {
        if (!activeOrganization) return;
        const res = await getRolesAction(activeOrganization.id);
        if (res.success) setAvailableRoles(res.roles || []);
    }

    const loadAgencies = async () => {
        if (!activeOrganization) return;
        const res = await getAgenciesAction(activeOrganization.id);
        if (res.success) setAvailableAgencies(res.agencies || []);
    }

    const loadFranchises = async () => {
        if (!activeOrganization) return;
        const res = await getFranchisesAction(activeOrganization.id);
        if (res.success) setAvailableFranchises(res.franchises || []);
    }

    async function loadUsers() {
        if (!activeOrganization) return;
        setIsLoading(true);
        const res = await getUsersAction(activeOrganization.id);
        if (res.success && res.users) {
            setUsers(res.users);
        }
        setIsLoading(false);
    }

    async function handleSaveUser(formData: FormData) {
        if (!activeOrganization) return;

        if (editingUser) {
            formData.append('userId', editingUser.id);
            const res = await updateUserAction(formData, activeOrganization.id);
            if (res.success) {
                setIsInviteModalOpen(false);
                setEditingUser(null);
                loadUsers();
            } else {
                alert(res.error || 'Failed to update');
            }
        } else {
            const res = await inviteUserAction(formData, activeOrganization.id);
            if (res.success) {
                setIsInviteModalOpen(false);
                loadUsers();
            } else {
                alert(res.error || 'Failed to invite');
            }
        }
    }

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setIsInviteModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {!hideHeader && (
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800">Gestion des Utilisateurs</h2>
                        <p className="text-sm text-slate-500">Gérez les accès et les permissions de vos collaborateurs</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <PageGuide
                            title="Gestion des Utilisateurs"
                            steps={[
                                { title: "Membres", description: "Liste de tous les collaborateurs ayant accès à cet espace de travail." },
                                { title: "Rôles", description: "Contrôlez les permissions (Admin, Manager, Commercial) pour sécuriser l'accès aux données." },
                                { title: "Invitation", description: "Ajoutez de nouveaux membres par e-mail. Ils recevront un lien d'activation." }
                            ]}
                        />
                        <Button onClick={() => setIsInviteModalOpen(true)} className="gap-2 font-bold">
                            <Plus size={16} /> Inviter un utilisateur
                        </Button>
                    </div>
                </div>
            )}

            {hideHeader && (
                <div className="flex justify-end mb-4">
                    <Button onClick={() => setIsInviteModalOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100">
                        <Plus size={16} /> Inviter un collaborateur
                    </Button>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Membres de l'organisation</CardTitle>
                    <CardDescription>
                        Liste complète des utilisateurs actifs et en attente valides pour {activeOrganization?.name}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Identité</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rôle & Périmètre</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">Chargement des utilisateurs...</TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">Aucun utilisateur trouvé.</TableCell>
                                </TableRow>
                            ) : (
                                users.map((user: any) => {
                                    // Resolve Role for current context
                                    const roleName = user.role || 'Inconnu';
                                    const currentAgencies = user.agencyIds || [];
                                    const currentFranchises = user.franchiseIds || [];

                                    return (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                        {user.firstName?.[0]}{user.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-900">{user.firstName} {user.lastName}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-500">{user.email}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800`}>
                                                        {roleName}
                                                    </span>
                                                    {currentFranchises.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {currentFranchises.map((fid: string) => {
                                                                const franchise = availableFranchises.find(f => f.id === fid);
                                                                return franchise ? (
                                                                    <span key={fid} className="text-[10px] text-purple-600 border border-purple-200 bg-purple-50 px-1 rounded flex items-center gap-0.5">
                                                                        <Building2 size={8} /> {franchise.name}
                                                                    </span>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                    )}
                                                    {currentAgencies.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {currentAgencies.map((aid: string) => {
                                                                const agency = availableAgencies.find(a => a.id === aid);
                                                                return agency ? (
                                                                    <span key={aid} className="text-[10px] text-slate-500 border border-slate-200 bg-slate-50 px-1 rounded">
                                                                        {agency.name}
                                                                    </span>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                    ${user.isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'}`}>
                                                    {user.isActive ? 'Actif' : 'En attente'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => openEditModal(user)}>Éditer</Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Modal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                title={editingUser ? "Modifier l'utilisateur" : "Inviter un nouvel utilisateur"}
            >
                <form action={handleSaveUser} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input name="firstName" label="Prénom" required defaultValue={editingUser?.firstName} />
                        <Input name="lastName" label="Nom" required defaultValue={editingUser?.lastName} />
                    </div>
                    <Input name="email" type="email" label="Adresse Email" required defaultValue={editingUser?.email} disabled={!!editingUser} />

                    {(() => {
                        // Safe logic to determine defaults
                        const currentRole = (editingUser as any)?.roleId;
                        const currentAgencies = (editingUser as any)?.agencyIds || [];
                        const currentFranchises = (editingUser as any)?.franchiseIds || [];

                        return (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Rôle</label>
                                    <Select name="role" defaultValue={currentRole}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner un rôle" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableRoles.map(r => (
                                                <SelectItem key={r.id} value={r.id}>
                                                    {r.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Franchise Selection */}
                                {availableFranchises.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                            <Building2 size={14} className="text-purple-600" />
                                            Franchises (accès à toutes les agences de la franchise)
                                        </label>
                                        <div className="grid grid-cols-2 gap-2 border rounded p-3 bg-purple-50/50 max-h-32 overflow-y-auto">
                                            {availableFranchises.map(franchise => (
                                                <div key={franchise.id} className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        name="franchiseIds"
                                                        value={franchise.id}
                                                        id={`franchise-${franchise.id}`}
                                                        defaultChecked={currentFranchises.includes(franchise.id)}
                                                        className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                                                    />
                                                    <label htmlFor={`franchise-${franchise.id}`} className="text-sm text-purple-700 cursor-pointer select-none">
                                                        {franchise.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Agency Selection */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Agences directes (optionnel)</label>
                                    <div className="grid grid-cols-2 gap-2 border rounded p-3 bg-slate-50 max-h-40 overflow-y-auto">
                                        {availableAgencies.map(agency => (
                                            <div key={agency.id} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    name="agencyIds"
                                                    value={agency.id}
                                                    id={`agency-${agency.id}`}
                                                    defaultChecked={currentAgencies.includes(agency.id)}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <label htmlFor={`agency-${agency.id}`} className="text-sm text-slate-600 cursor-pointer select-none">
                                                    {agency.name}
                                                    {agency.franchise && (
                                                        <span className="text-[10px] text-purple-500 ml-1">({agency.franchise.name})</span>
                                                    )}
                                                </label>
                                            </div>
                                        ))}
                                        {availableAgencies.length === 0 && <span className="text-sm text-slate-400 col-span-2">Aucune agence disponible</span>}
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => { setIsInviteModalOpen(false); setEditingUser(null); }}>Annuler</Button>
                        <Button type="submit">{editingUser ? 'Enregistrer' : 'Envoyer l\'invitation'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
