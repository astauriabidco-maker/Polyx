'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createOrganizationAction } from '@/application/actions/organization.actions';
import { activateOrganisation } from '@/actions/super-admin';
import { checkIsGlobalAdminAction, logoutAction } from '@/application/actions/auth.actions';
import { useAuthStore } from '@/application/store/auth-store';
import { HubGrid } from '@/components/dashboard/HubGrid';
import { OrgAccessDTO } from '@/lib/permissions';
import { Plus, AlertTriangle, Building2, CheckCircle2, Globe, LogOut, Loader2, Sparkles, LayoutGrid } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function HubPage() {
    const [orgs, setOrgs] = useState<OrgAccessDTO[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
    const router = useRouter();
    const { user, setActiveOrganization, logout } = useAuthStore();

    // Create Org State
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newOrgData, setNewOrgData] = useState({ name: '', siret: '' });
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    useEffect(() => {
        async function loadHub() {
            try {
                const [response, adminCheck] = await Promise.all([
                    fetch('/api/user/access'),
                    checkIsGlobalAdminAction()
                ]);

                if (response.status === 401) {
                    router.push('/login');
                    return;
                }

                const data = await response.json();
                setOrgs(data);
                setIsGlobalAdmin(adminCheck);
            } catch (error) {
                console.error('Failed to load hub:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadHub();
    }, [router]);

    const handleSelectOrg = (orgId: string) => {
        const selected = orgs.find(o => o.organisationId === orgId);
        if (selected) {
            setActiveOrganization({
                id: selected.organisationId,
                name: selected.organisationName,
                role: selected.role
            }, selected.computedPermissions);
            router.push('/app/dashboard');
        }
    };

    const handleCreateOrg = async () => {
        if (!newOrgData.name) {
            setCreateError('Le nom de l\'organisation est requis.');
            return;
        }

        setIsCreating(true);
        setCreateError(null);

        try {
            // 1. Create Org
            const result = await createOrganizationAction({
                name: newOrgData.name,
                siret: newOrgData.siret,
                email: user!.email // Current user becomes admin
            });

            if (result.success && result.organization) {
                // 2. Activate with current user as admin
                const activationResult = await activateOrganisation(
                    result.organization.id,
                    user!.email,
                    `${user!.firstName} ${user!.lastName}`
                );

                if (activationResult.success) {
                    // Reload Hub
                    window.location.reload();
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

    const handleLogout = async () => {
        await logoutAction();
        logout();
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header Hub */}
            <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
                    <span className="text-xl font-black text-slate-900 tracking-tight">POLYX <span className="text-indigo-600">HUB</span></span>
                </div>

                <div className="flex items-center gap-4">
                    {isGlobalAdmin && (
                        <>
                            <button
                                onClick={() => setCreateModalOpen(true)}
                                className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            >
                                <Plus size={14} />
                                Créer OF
                            </button>
                            <button
                                onClick={() => router.push('/super-admin')}
                                className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                            >
                                <Globe size={14} />
                                Nexus Admin
                            </button>
                        </>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-semibold text-sm"
                    >
                        <LogOut size={18} />
                        Déconnexion
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="bg-white border-b border-slate-100 py-12">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="flex items-center gap-3 text-indigo-600 mb-4">
                        <Sparkles size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest">Sélecteur d'Espace</span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Bonjour, {user?.firstName || 'Utilisateur'} 👋</h1>
                    <p className="text-slate-500 max-w-2xl text-lg">
                        Séléctionnez l'organisation sur laquelle vous souhaitez travailler aujourd'hui.
                        Vos permissions et accès financiers sont automatiquement configurés.
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto w-full py-12 px-2">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="animate-spin text-indigo-600" size={40} />
                        <p className="text-slate-500 font-medium">Récupération de vos accès matriciels...</p>
                    </div>
                ) : orgs.length > 0 ? (
                    <HubGrid orgAccessList={orgs} onSelectOrg={handleSelectOrg} />
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 mx-6">
                        <LayoutGrid size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-xl font-bold text-slate-900">Aucun accès trouvé</h3>
                        <p className="text-slate-500 mb-6">Contactez votre administrateur pour obtenir une clé d'accès.</p>
                        {isGlobalAdmin && (
                            <div className="flex justify-center gap-4">
                                <Button
                                    onClick={() => setCreateModalOpen(true)}
                                    className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                                >
                                    <Plus className="mr-2" size={18} /> Créer ma première Organisation
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-100 bg-white">
                Polyx Academy &copy; 2026 - Plateforme CRM Multi-Tenant Multi-Rôles
            </footer>

            {/* Create Org Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="text-indigo-600" size={20} />
                            Nouvelle Organisation
                        </DialogTitle>
                        <DialogDescription>
                            Vous serez automatiquement administrateur de cette nouvelle structure.
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
                                <label className="text-sm font-medium text-slate-700 block mb-1">Numéro SIRET (Optionnel)</label>
                                <Input
                                    placeholder="14 chiffres"
                                    value={newOrgData.siret}
                                    onChange={(e) => setNewOrgData({ ...newOrgData, siret: e.target.value })}
                                />
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
                            {isCreating ? 'Création...' : 'Créer & Accéder'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
