'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutGrid, ChartBar, Users, BookOpen, GraduationCap,
    Fingerprint, Briefcase, Folder, ShieldCheck, Settings2,
    Network, DollarSign, Zap, FileText, LogOut, MapPin, ClipboardCheck, Terminal, Radar, FileSpreadsheet, BrainCircuit, Calendar, Target, Globe
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Button } from '@/components/ui/button';
import { getSessionAction, logoutAction, checkIsGlobalAdminAction } from '@/application/actions/auth.actions';
import { Toaster } from '@/components/ui/toaster';
import { AgencySwitcher } from '@/components/layout/agency-switcher';
import { APP_MODULES } from '@/application/config/modules.config';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, activeOrganization, login, logout, hasPermission, setAccessibleOrgs } = useAuthStore();

    const [mounted, setMounted] = useState(false);
    const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Refresh session to sync dynamic permissions from backend
        getSessionAction().then(res => {
            if (res.success && res.user && res.organization && res.membership && res.permissions) {
                login(res.user as any, res.organization as any, res.membership as any, res.permissions as any);
                // Sync accessible orgs for Nexus mode
                if ((res as any).accessibleOrgs) {
                    setAccessibleOrgs((res as any).accessibleOrgs);
                }
            }
        });
        checkIsGlobalAdminAction().then(setIsGlobalAdmin);
    }, []);

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
                    {/* DYNAMIC NAVIGATION FROM MODULE CONFIG */}
                    {APP_MODULES.map((category, catIdx) => (
                        <div key={category.name} className={cn("space-y-1", catIdx > 0 && "pt-6")}>
                            <div className="pb-2">
                                <p className={cn("px-3 text-[10px] font-black uppercase tracking-widest", category.color)}>
                                    {category.name}
                                </p>
                            </div>
                            {category.modules.filter(m => hasPermission(m.id as any)).map((item) => {
                                const pureHref = item.href.split('?')[0];
                                const isActive = pathname.startsWith(pureHref);
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                            isActive
                                                ? 'bg-slate-50 text-indigo-700 font-bold border-r-2 border-indigo-500 rounded-r-none'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        )}
                                    >
                                        <item.icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {isGlobalAdmin && (
                    <div className="px-4 py-2 border-t border-slate-100">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold"
                            onClick={() => router.push('/app/admin/nexus')}
                        >
                            <Globe size={16} className="mr-2" />
                            Nexus Admin
                        </Button>
                    </div>
                )}

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
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={async () => {
                        await logoutAction();
                        logout();
                        window.location.href = '/login';
                    }}>
                        <LogOut size={14} /> Log out
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
