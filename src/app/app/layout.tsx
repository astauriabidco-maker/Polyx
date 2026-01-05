'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Button } from '@/components/ui/button';
import { getSessionAction, logoutAction } from '@/application/actions/auth.actions';
import { Toaster } from '@/components/ui/toaster';
import { AgencySwitcher } from '@/components/layout/agency-switcher';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, activeOrganization, login, logout, hasPermission } = useAuthStore();

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const navigation = [
        { name: 'Dashboard', href: '/app/dashboard', icon: 'ChartBarIcon', show: true },
        { name: 'Prosp. & Commercial', href: '/app/leads', icon: 'UsersIcon', show: hasPermission('canManageLeads') },
        { name: 'Pédagogie / Catalogue', href: '/app/academy/catalog', icon: 'BookOpenIcon', show: hasPermission('canManageCourses') }, // [NEW]
        { name: 'Mes Apprenants', href: '/app/learners', icon: 'AcademicCapIcon', show: true },
        { name: 'Émargement', href: '/app/attendance', icon: 'FingerPrintIcon', show: true }, // [NEW]
        { name: 'CRM / Closing', href: '/app/crm', icon: 'BriefcaseIcon', show: hasPermission('canManageLeads') },
        { name: 'Gestion Administrative', href: '/app/admin', icon: 'FolderIcon', show: hasPermission('canEditUsers') },
        { name: 'Qualité / Audit', href: '/app/quality', icon: 'ShieldCheckIcon', show: hasPermission('canManageCourses') },
    ];

    const settingsNav = [
        { name: 'Profil Organisation', href: '/app/settings/organization', show: hasPermission('canEditUsers') },
        { name: 'Réseau & Agences', href: '/app/settings/structure', show: hasPermission('canEditUsers') },
        { name: 'Users', href: '/app/settings/users', show: hasPermission('canEditUsers') },
        { name: 'Matrice de Permissions', href: '/app/settings/roles', show: hasPermission('canEditUsers') },
        { name: 'Pondération Scoring IA', href: '/app/settings/scoring', show: hasPermission('canEditUsers') }, // [NEW]
        { name: 'Intégrations (API)', href: '/app/settings/integrations', show: hasPermission('canEditUsers') },
        { name: 'Documents Légaux', href: '/app/settings/legal', show: hasPermission('canViewFinance') },
    ];

    // Prevent hydration mismatch by not rendering permission-dependent UI until mounted
    if (!mounted) {
        return (
            <div className="flex h-screen bg-slate-50">
                <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <div className="h-8 w-8 bg-slate-200 rounded-lg animate-pulse" />
                    </div>
                </aside>
                <main className="flex-1 overflow-auto bg-slate-50" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
                        <span className="font-semibold text-slate-900">Polyx</span>
                    </div>
                    {activeOrganization && (
                        <Link
                            href="/hub"
                            className="text-[10px] px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 rounded text-indigo-600 font-bold border border-indigo-100 transition-colors uppercase"
                        >
                            {activeOrganization.name} ⇵
                        </Link>
                    )}
                </div>

                <div className="px-3 pt-2">
                    <AgencySwitcher />
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navigation.filter(i => i.show).map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                  flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
                            >
                                {/* Icon Placeholder */}
                                <span className={`h-4 w-4 rounded-full ${isActive ? 'bg-indigo-400' : 'bg-slate-300'}`} />
                                {item.name}
                            </Link>
                        )
                    })}

                    {settingsNav.some(i => i.show) && (
                        <div className="pt-6 pb-2">
                            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Settings</p>
                        </div>
                    )}
                    {settingsNav.filter(i => i.show).map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                  flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
                            >
                                <span className={`h-4 w-4 rounded-full border ${isActive ? 'border-indigo-400' : 'border-slate-300'}`} />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{user?.firstName} {user?.lastName}</p>
                            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full mb-2 gap-2 text-indigo-600 border-indigo-100 hover:bg-indigo-50"
                        onClick={() => router.push('/hub')}
                    >
                        <LayoutGrid size={14} /> Changer d'Espace
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" onClick={async () => {
                        await logoutAction();
                        logout();
                        window.location.href = '/login';
                    }}>
                        Log out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 ${pathname.startsWith('/app/leads') ? 'overflow-hidden flex flex-col relative' : 'overflow-auto'}`}>
                {children}
            </main>
            <Toaster />
        </div>
    );
}
