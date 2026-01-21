'use client';

import React, { useEffect, useState } from 'react';
import { HubGrid } from '@/components/dashboard/HubGrid';
import { OrgAccessDTO } from '@/lib/permissions';
import { LayoutGrid, LogOut, Loader2, Sparkles, Globe } from 'lucide-react';
import { useAuthStore } from '@/application/store/auth-store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { checkIsGlobalAdminAction, logoutAction } from '@/application/actions/auth.actions';

export default function HubPage() {
    const [orgs, setOrgs] = useState<OrgAccessDTO[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
    const router = useRouter();
    const { user, setActiveOrganization, logout } = useAuthStore();

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
                        <button
                            onClick={() => router.push('/super-admin')}
                            className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                            <Globe size={14} />
                            Nexus Admin
                        </button>
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
                        <p className="text-slate-500">Contactez votre administrateur pour obtenir une clé d'accès.</p>
                        {isGlobalAdmin && (
                            <Button
                                variant="outline"
                                onClick={() => router.push('/super-admin')}
                                className="mt-6 font-bold"
                            >
                                Accéder au Nexus Master
                            </Button>
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-100 bg-white">
                Polyx Academy &copy; 2026 - Plateforme CRM Multi-Tenant Multi-Rôles
            </footer>
        </div>
    );
}
