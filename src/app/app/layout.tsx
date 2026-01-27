'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutGrid, ChartBar, Users, BookOpen, GraduationCap,
    Fingerprint, Briefcase, Folder, ShieldCheck, Settings2,
    Network, DollarSign, Zap, FileText, LogOut, MapPin, ClipboardCheck, Terminal, Radar, FileSpreadsheet, BrainCircuit, Calendar, Target, Globe,
    ChevronDown, ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Button } from '@/components/ui/button';
import { getSessionAction, logoutAction, checkIsGlobalAdminAction } from '@/application/actions/auth.actions';
import { getPlatformConfigAction } from '@/application/actions/platform.actions';
import { Toaster } from '@/components/ui/toaster';
import { WorkspaceSwitcher } from '@/components/layout/workspace-switcher';
import { APP_MODULES } from '@/application/config/modules.config';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, activeOrganization, login, logout, hasPermission, setAccessibleOrgs } = useAuthStore();

    const [mounted, setMounted] = useState(false);
    const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
    const [footerText, setFooterText] = useState('Powered by Polyx');
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

    const toggleMenu = (id: string) => {
        setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));
    };

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
        getPlatformConfigAction().then(res => {
            if (res.success && res.data?.footerText) {
                setFooterText(res.data.footerText);
            }
        });
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
                <div className="pt-2"></div>

                <div className="px-3 pt-4 pb-2">
                    <WorkspaceSwitcher />
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
                            {category.modules.filter(m => hasPermission(m.id as any) || (m.id === 'NEXUS_VIEW' && isGlobalAdmin)).map((item) => {
                                const pureHref = item.href.split('?')[0];
                                const isActive = pathname.startsWith(pureHref);
                                const hasSubItems = item.subItems && item.subItems.length > 0;
                                const isExpanded = expandedMenus[item.id] || isActive; // Auto-expand if active

                                if (hasSubItems) {
                                    return (
                                        <div key={item.id} className="space-y-1">
                                            <button
                                                onClick={() => toggleMenu(item.id)}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors group",
                                                    isActive
                                                        ? 'bg-slate-50 text-indigo-700'
                                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <item.icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'} />
                                                    {item.name}
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronDown size={14} className="text-slate-400" />
                                                ) : (
                                                    <ChevronRight size={14} className="text-slate-400" />
                                                )}
                                            </button>

                                            {/* Submenu Items */}
                                            {isExpanded && (
                                                <div className="ml-9 space-y-1 border-l-2 border-slate-100 pl-2">
                                                    {item.subItems?.filter(sub => hasPermission(sub.id as any)).map(sub => {
                                                        // Determine href for sub-item
                                                        // Convention: If hrefPath is provided, use parent + hrefPath
                                                        // Otherwise try to map via known routes or use query params?
                                                        // For now, based on config, let's hardcode some logic or use hrefPath if available
                                                        // Updated logic: We need mapping for these specific IDs to routes since config only has ID/Name

                                                        let subHref = sub.hrefPath || item.href;

                                                        // Legacy Hardcoded Fallbacks (to be cleaned up later)
                                                        if (!sub.hrefPath) {
                                                            if (sub.id === 'ROLES_MANAGE') subHref = '/app/admin/roles';
                                                            if (sub.id === 'USERS_MANAGE') subHref = '/app/admin/teams';
                                                            if (sub.id === 'STRUCTURE_MANAGE') subHref = '/app/admin/structure';
                                                            if (sub.id === 'LEADS_PIPELINE') subHref = '/app/leads/pipeline';
                                                            if (sub.id === 'LEADS_ORCHESTRATION') subHref = '/app/leads/orchestration';
                                                            if (sub.id === 'LEADS_SEGMENTS') subHref = '/app/leads/segments';
                                                        }

                                                        const isSubActive = pathname === subHref;

                                                        return (
                                                            <Link
                                                                key={sub.id}
                                                                href={subHref}
                                                                className={cn(
                                                                    "block px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                                                                    isSubActive
                                                                        ? 'text-indigo-600 bg-indigo-50/50'
                                                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                                                )}
                                                            >
                                                                {sub.name}
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

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

                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={async () => {
                        await logoutAction();
                        logout();
                        window.location.href = '/login';
                    }}>
                        <LogOut size={14} /> Log out
                    </Button>
                    <div className="mt-4 text-[10px] text-center text-slate-300 font-medium">
                        {footerText}
                    </div>
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
