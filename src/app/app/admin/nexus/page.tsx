'use client';

import React, { useEffect, useState } from 'react';
import {
    getAllOrganisations,
    getPlatformStats,
    activateOrganisation,
    rejectOrganisation,
    suspendOrganisation
} from '@/actions/super-admin';
import { createOrganizationAction } from '@/application/actions/organization.actions';
import { checkIsGlobalAdminAction } from '@/application/actions/auth.actions';
import {
    Building2,
    Users,
    Clock,
    Search,
    Globe,
    ShieldCheck,
    CheckCircle2,
    XCircle,
    LayoutGrid,
    Plus,
    AlertTriangle,
    Mail,
    Pause,
    Play,
    X,
    Filter,
    Network,
    ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/application/store/auth-store';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    PENDING: { label: 'En attente', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Clock },
    ACTIVE: { label: 'Actif', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
    SUSPENDED: { label: 'Suspendu', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', icon: Pause },
    REJECTED: { label: 'Rejeté', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: XCircle }
};

export default function NexusPage() {
    const router = useRouter();
    const [isGlobalAdmin, setIsGlobalAdmin] = useState<boolean | null>(null);
    const [orgs, setOrgs] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Modals
    const [actionModal, setActionModal] = useState<{ type: 'activate' | 'reject' | 'suspend' | null; org: any }>({ type: null, org: null });
    const [reason, setReason] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminName, setAdminName] = useState('');
    const [isActioning, setIsActioning] = useState(false);

    // New Organization Modal
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newOrgData, setNewOrgData] = useState({ name: '', siret: '', adminEmail: '', adminName: '' });
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    useEffect(() => {
        checkIsGlobalAdminAction().then((result) => {
            setIsGlobalAdmin(result);
            if (!result) {
                router.push('/app/admin');
            }
        });
    }, [router]);

    useEffect(() => {
        if (isGlobalAdmin) {
            fetchData();
        }
    }, [statusFilter, isGlobalAdmin]);

    const fetchData = async () => {
        setIsLoading(true);
        const [orgsRes, statsRes] = await Promise.all([
            getAllOrganisations(statusFilter),
            getPlatformStats()
        ]);
        if (orgsRes.success) setOrgs(orgsRes.organisations || []);
        if (statsRes.success) setStats(statsRes.stats);
        setIsLoading(false);
    };

    const handleAction = async () => {
        if (!actionModal.org || !actionModal.type) return;
        setIsActioning(true);

        let result;
        if (actionModal.type === 'activate') {
            const emailToUse = adminEmail.trim() || actionModal.org.primaryContactEmail;
            const nameToUse = adminName.trim() || actionModal.org.primaryContactName;
            result = await activateOrganisation(actionModal.org.id, emailToUse, nameToUse);
        } else if (actionModal.type === 'reject') {
            result = await rejectOrganisation(actionModal.org.id, reason);
        } else if (actionModal.type === 'suspend') {
            result = await suspendOrganisation(actionModal.org.id, reason);
        }

        if (result?.success) {
            await fetchData();
            setActionModal({ type: null, org: null });
            setReason('');
            setAdminEmail('');
            setAdminName('');
        }
        setIsActioning(false);
    };

    const handleCreateOrg = async () => {
        if (!newOrgData.name || !newOrgData.adminEmail) {
            setCreateError('Le nom de l\'organisation et l\'email admin sont requis.');
            return;
        }
        setIsCreating(true);
        setCreateError(null);

        try {
            const result = await createOrganizationAction({
                name: newOrgData.name,
                siret: newOrgData.siret,
                email: newOrgData.adminEmail
            });

            if (result.success && result.organization) {
                const activationResult = await activateOrganisation(
                    result.organization.id,
                    newOrgData.adminEmail,
                    newOrgData.adminName
                );

                if (activationResult.success) {
                    await fetchData();
                    setCreateModalOpen(false);
                    setNewOrgData({ name: '', siret: '', adminEmail: '', adminName: '' });
                } else {
                    setCreateError(activationResult.error || 'Erreur lors de l\'activation');
                }
            } else {
                setCreateError(result.error || 'Erreur lors de la création');
            }
        } catch (error) {
            console.error('Create Org Error:', error);
            setCreateError('Une erreur inattendue est survenue.');
        } finally {
            setIsCreating(false);
        }
    };

    const filteredOrgs = orgs.filter(o =>
        o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.siret && o.siret.includes(searchTerm)) ||
        (o.primaryContactEmail && o.primaryContactEmail.includes(searchTerm))
    );

    if (isGlobalAdmin === null) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isGlobalAdmin) {
        return null;
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <Globe size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Nexus Master</h1>
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Platform Management</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => router.push('/app/network')}>
                        <Network size={16} className="mr-2 text-indigo-600" /> Gérer les Réseaux
                    </Button>
                    <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
                        onClick={() => setCreateModalOpen(true)}
                    >
                        <Plus size={16} className="mr-2" /> Nouvel OF
                    </Button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        <span className="text-xs font-bold text-slate-600">Super-Admin</span>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <KPICard title="Total OF" value={stats.totalOrgs} icon={<Building2 className="text-indigo-600" />} color="bg-indigo-50" />
                    <KPICard title="En attente" value={stats.pendingOrgs} icon={<Clock className="text-amber-600" />} color="bg-amber-50" accent />
                    <KPICard title="Actifs" value={stats.activeOrgs} icon={<CheckCircle2 className="text-emerald-600" />} color="bg-emerald-50" />
                    <KPICard title="Utilisateurs" value={stats.totalUsers} icon={<Users className="text-blue-600" />} color="bg-blue-50" />
                    <KPICard title="Invitations" value={stats.pendingInvitations} icon={<Mail className="text-purple-600" />} color="bg-purple-50" />
                </div>
            )}

            {/* Organizations Table Card */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between py-6">
                    <div>
                        <CardTitle className="text-xl font-black">Répertoire des Tenants</CardTitle>
                        <p className="text-sm text-slate-500">Gérez l'accès et le statut de tous les OF du réseau.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Status Filter */}
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                            <Filter size={14} className="text-slate-400 ml-2" />
                            {['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === status
                                        ? 'bg-white shadow text-slate-900'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {status === 'ALL' ? 'Tous' : STATUS_CONFIG[status]?.label}
                                </button>
                            ))}
                        </div>
                        {/* Search */}
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <Input
                                placeholder="Rechercher par nom, SIRET, email..."
                                className="pl-10 h-11 bg-slate-50 border-slate-100 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="py-20 text-center">
                            <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-500">Chargement...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-4">Organisation</th>
                                        <th className="px-6 py-4">Contact Principal</th>
                                        <th className="px-6 py-4">Stats</th>
                                        <th className="px-6 py-4">Status & Historique</th>
                                        <th className="px-8 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredOrgs.map((org) => {
                                        const statusCfg = STATUS_CONFIG[org.status] || STATUS_CONFIG.PENDING;
                                        const StatusIcon = statusCfg.icon;

                                        return (
                                            <tr key={org.id} className="hover:bg-slate-50/30 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 shadow-sm group-hover:scale-110 transition-all">
                                                            <Building2 size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900">{org.name}</p>
                                                            <p className="text-xs text-slate-400 font-mono italic">SIRET: {org.siret || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    {org.primaryContactEmail ? (
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-700">{org.primaryContactName || '—'}</p>
                                                            <p className="text-xs text-slate-400">{org.primaryContactEmail}</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Non défini</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex gap-4">
                                                        <StatMini label="Users" value={org._count?.accessGrants} />
                                                        <StatMini label="Leads" value={org._count?.leads} />
                                                        <StatMini label="Learners" value={org._count?.learners} />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col items-start gap-2">
                                                        <Badge className={`${statusCfg.bg} ${statusCfg.color} border gap-1.5`}>
                                                            <StatusIcon size={12} />
                                                            {statusCfg.label}
                                                        </Badge>
                                                        {(org.status === 'ACTIVE' || org.status === 'REJECTED' || org.status === 'SUSPENDED') && (
                                                            <div className="text-[10px] text-slate-400">
                                                                {org.activatedByName && (
                                                                    <p>Par <span className="font-medium text-slate-600">{org.activatedByName}</span></p>
                                                                )}
                                                                {org.activatedAt && (
                                                                    <p>Le {new Date(org.activatedAt).toLocaleDateString('fr-FR')}</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {org.status === 'PENDING' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                    onClick={() => setActionModal({ type: 'activate', org })}
                                                                >
                                                                    <Play size={14} className="mr-1" /> Valider
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="border-red-200 text-red-600 hover:bg-red-50"
                                                                    onClick={() => setActionModal({ type: 'reject', org })}
                                                                >
                                                                    <X size={14} className="mr-1" /> Rejeter
                                                                </Button>
                                                            </>
                                                        )}
                                                        {org.status === 'ACTIVE' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="border-orange-200 text-orange-600 hover:bg-orange-50"
                                                                onClick={() => setActionModal({ type: 'suspend', org })}
                                                            >
                                                                <Pause size={14} className="mr-1" /> Suspendre
                                                            </Button>
                                                        )}
                                                        {(org.status === 'SUSPENDED' || org.status === 'REJECTED') && (
                                                            <Button
                                                                size="sm"
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                onClick={() => setActionModal({ type: 'activate', org })}
                                                            >
                                                                <Play size={14} className="mr-1" /> Réactiver
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!isLoading && filteredOrgs.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center">
                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                                <Search size={32} />
                            </div>
                            <p className="text-slate-500 font-medium">Aucune organisation ne correspond à votre recherche.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Action Modal */}
            <Dialog open={!!actionModal.type} onOpenChange={() => { setActionModal({ type: null, org: null }); setReason(''); setAdminEmail(''); setAdminName(''); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {actionModal.type === 'activate' && <CheckCircle2 className="text-emerald-600" size={20} />}
                            {actionModal.type === 'reject' && <XCircle className="text-red-600" size={20} />}
                            {actionModal.type === 'suspend' && <Pause className="text-orange-600" size={20} />}
                            {actionModal.type === 'activate' && 'Valider cette organisation'}
                            {actionModal.type === 'reject' && 'Rejeter cette organisation'}
                            {actionModal.type === 'suspend' && 'Suspendre cette organisation'}
                        </DialogTitle>
                        <DialogDescription>{actionModal.org?.name}</DialogDescription>
                    </DialogHeader>

                    {actionModal.type === 'activate' && (
                        <div className="py-4 space-y-4">
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-emerald-700">
                                <p className="font-medium mb-2">Cette action va :</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Activer l'organisation</li>
                                    <li>Créer le rôle Administrateur avec toutes les permissions</li>
                                    <li>Envoyer une invitation par email</li>
                                </ul>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-slate-700 block mb-1">Nom de l'administrateur</label>
                                    <Input
                                        placeholder={actionModal.org?.primaryContactName || 'Ex: Jean Dupont'}
                                        value={adminName}
                                        onChange={(e) => setAdminName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 block mb-1">Email de l'administrateur *</label>
                                    <Input
                                        type="email"
                                        placeholder={actionModal.org?.primaryContactEmail || 'admin@organisme.fr'}
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-400 mt-1">
                                        {actionModal.org?.primaryContactEmail
                                            ? `Par défaut : ${actionModal.org.primaryContactEmail}`
                                            : 'Aucun email de contact principal défini'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {(actionModal.type === 'reject' || actionModal.type === 'suspend') && (
                        <div className="py-4">
                            <label className="text-sm font-medium text-slate-700 block mb-2">Motif *</label>
                            <Textarea
                                placeholder="Expliquez la raison..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                            />
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setActionModal({ type: null, org: null })}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleAction}
                            disabled={isActioning || ((actionModal.type === 'reject' || actionModal.type === 'suspend') && !reason)}
                            className={
                                actionModal.type === 'activate' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                    actionModal.type === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                                        'bg-orange-600 hover:bg-orange-700'
                            }
                        >
                            {isActioning ? 'En cours...' : 'Confirmer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Organization Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="text-indigo-600" size={20} />
                            Créer un nouvel OF
                        </DialogTitle>
                        <DialogDescription>
                            Initialisez une nouvelle structure immédiatement opérationnelle.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Nom de l'organisation *</label>
                                <Input
                                    placeholder="Ex: ACME Academy"
                                    value={newOrgData.name}
                                    onChange={(e) => setNewOrgData({ ...newOrgData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Numéro SIRET</label>
                                <Input
                                    placeholder="14 chiffres"
                                    value={newOrgData.siret}
                                    onChange={(e) => setNewOrgData({ ...newOrgData, siret: e.target.value })}
                                />
                            </div>
                            <div className="pt-2 border-t border-slate-100">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Administrateur Initial</p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 block mb-1">Nom (Optionnel)</label>
                                        <Input
                                            placeholder="Ex: Jean Dupont"
                                            value={newOrgData.adminName}
                                            onChange={(e) => setNewOrgData({ ...newOrgData, adminName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 block mb-1">Email *</label>
                                        <Input
                                            type="email"
                                            placeholder="admin@organisme.fr"
                                            value={newOrgData.adminEmail}
                                            onChange={(e) => setNewOrgData({ ...newOrgData, adminEmail: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {createError && (
                            <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2 text-xs text-red-600">
                                <AlertTriangle size={14} />
                                {createError}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleCreateOrg}
                            disabled={isCreating}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isCreating ? 'Initialisation...' : 'Créer & Activer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function KPICard({ title, value, icon, color, accent }: { title: string; value: any; icon: any; color: string; accent?: boolean }) {
    return (
        <Card className={`border-slate-200 shadow-sm hover:shadow-md transition-shadow ${accent && value > 0 ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${color}`}>
                        {icon}
                    </div>
                    {accent && value > 0 && (
                        <span className="animate-pulse">
                            <AlertTriangle size={16} className="text-amber-500" />
                        </span>
                    )}
                </div>
                <div>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">{value ?? '...'}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function StatMini({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</span>
            <span className="text-sm font-black text-slate-700">{value ?? 0}</span>
        </div>
    );
}
