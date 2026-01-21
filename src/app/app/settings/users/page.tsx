'use client';

import { useEffect, useState } from 'react';
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
import { Role, RoleDefinition } from '@/domain/entities/permission';
import { PageGuide } from '@/components/ui/page-guide';
import { Building2 } from 'lucide-react';

export default function UsersPage() {
    const { activeOrganization } = useAuthStore();
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
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users & Roles</h1>
                    <p className="text-slate-500">Manage access to {activeOrganization?.name}</p>
                </div>
                <div className="flex items-center gap-4">
                    <PageGuide
                        title="Gestion des Utilisateurs"
                        steps={[
                            { title: "Membres", description: "Liste de tous les collaborateurs ayant accès à cet espace de travail." },
                            { title: "Rôles", description: "Contrôlez les permissions (Admin, Manager, Commercial) pour sécuriser l'accès aux données." },
                            { title: "Invitation", description: "Ajoutez de nouveaux membres par e-mail. Ils recevront un lien d'activation." }
                        ]}
                    />
                    <Button onClick={() => setIsInviteModalOpen(true)}>Invite User</Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                        A list of all users who have access to this organization workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">Loading users...</TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">No users found.</TableCell>
                                </TableRow>
                            ) : (
                                users.map((user: any) => {
                                    // Resolve Role for current context
                                    const roleName = user.role || 'Unknown';
                                    const currentAgencies = user.agencyIds || [];
                                    const currentFranchises = user.franchiseIds || [];

                                    return (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800`}>
                                                        {roleName}
                                                    </span>
                                                    {currentFranchises.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
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
                                                        <div className="flex flex-wrap gap-1">
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
                                                    ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {user.isActive ? 'Active' : 'Pending'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => openEditModal(user)}>Edit</Button>
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
                title="Invite New User"
            >
                <form action={handleSaveUser} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input name="firstName" label="First Name" required defaultValue={editingUser?.firstName} />
                        <Input name="lastName" label="Last Name" required defaultValue={editingUser?.lastName} />
                    </div>
                    <Input name="email" type="email" label="Email Address" required defaultValue={editingUser?.email} disabled={!!editingUser} />

                    {(() => {
                        // Safe logic to determine defaults
                        const currentRole = (editingUser as any)?.roleId;
                        const currentAgencies = (editingUser as any)?.agencyIds || [];
                        const currentFranchises = (editingUser as any)?.franchiseIds || [];

                        return (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Role</label>
                                    <Select name="role" defaultValue={currentRole}>
                                        <SelectTrigger>
                                            <SelectValue />
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
                                    <label className="text-sm font-medium text-slate-700">Agences directes (optionnel pour Admin)</label>
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
                        <Button type="button" variant="outline" onClick={() => { setIsInviteModalOpen(false); setEditingUser(null); }}>Cancel</Button>
                        <Button type="submit">{editingUser ? 'Save Changes' : 'Send Invitation'}</Button>
                    </div>
                </form>
            </Modal>
        </div >
    );
}
