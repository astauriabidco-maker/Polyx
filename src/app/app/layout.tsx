'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutGrid, ChartBar, Users, BookOpen, GraduationCap,
    Fingerprint, Briefcase, Folder, ShieldCheck, Settings2,
    Network, DollarSign, Zap, FileText, LogOut, MapPin, ClipboardCheck, Terminal, Radar, FileSpreadsheet, BrainCircuit, Calendar
} from 'lucide-react';
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

    const commercialNav = [
        { name: 'Tableau de Bord', href: '/app/dashboard', icon: ChartBar, show: true },
        { name: 'Agenda Intelligent', href: '/app/agenda', icon: Calendar, show: true },
        { name: 'Leads & Marketing', href: '/app/leads', icon: Users, show: hasPermission('canManageLeads') },
        { name: 'CRM & Closing', href: '/app/crm', icon: Briefcase, show: hasPermission('canManageLeads') },
    ];

    const trainingNav = [
        { name: 'Mes Apprenants', href: '/app/learners', icon: GraduationCap, show: true },
        { name: 'Suivi Émargement', href: '/app/attendance', icon: Fingerprint, show: true },
        { name: 'Sessions d\'Examens', href: '/app/network?tab=exams', icon: ClipboardCheck, show: true },
        { name: 'Gestion Formateurs', href: '/app/formateur', icon: Users, show: hasPermission('canEditUsers') },
        { name: 'Pédagogie / Catalogue', href: '/app/academy/catalog', icon: BookOpen, show: hasPermission('canManageCourses') },
        { name: 'Qualité / Audit', href: '/app/quality', icon: ShieldCheck, show: hasPermission('canManageCourses') },
        { name: 'Veille & Écosystème', href: '/app/veille', icon: Radar, show: hasPermission('canManageCourses') },
    ];

    const exploitationNav = [
        { name: 'Structure & Agences', href: '/app/network?tab=agencies', icon: MapPin, show: hasPermission('canEditUsers') },
        { name: 'Gestion Franchises', href: '/app/network?tab=franchises', icon: Network, show: hasPermission('canEditUsers') },
        { name: 'Redevances & Factures', href: '/app/network?tab=billing', icon: DollarSign, show: hasPermission('canEditUsers') },
        { name: 'Facturation Client', href: '/app/billing/invoices', icon: FileText, show: true }, // New Invoice Module active
        { name: 'Administration', href: '/app/settings/management', icon: Settings2, show: hasPermission('canEditUsers') },
        { name: 'Planificateur (CRON)', href: '/app/settings/scheduler', icon: Terminal, show: hasPermission('canEditUsers') },
        { name: 'Audit & Contrôle', href: '/app/audit', icon: ShieldCheck, show: hasPermission('canEditUsers') },
        { name: 'Bilan Pédagogique (BPF)', href: '/app/bpf', icon: FileSpreadsheet, show: hasPermission('canEditUsers') },
        { name: 'Cockpit Stratégique', href: '/app/reporting', icon: BrainCircuit, show: hasPermission('canEditUsers') },
        { name: 'Intégrations API', href: '/app/settings/integrations', icon: Settings2, show: hasPermission('canEditUsers') },
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
                    {/* HUB QUALIFICATION */}
                    <div className="pb-2">
                        <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qualification</p>
                    </div>
                    {commercialNav.filter(i => i.show).map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`
                                  flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors
                                  ${isActive ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                `}
                            >
                                <item.icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                                {item.name}
                            </Link>
                        )
                    })}

                    {/* HUB SUIVI FORMATION */}
                    <div className="pt-6 pb-2">
                        <p className="px-3 text-[10px] font-black text-blue-500 uppercase tracking-widest">Suivi Formation</p>
                    </div>
                    {trainingNav.filter(i => i.show).map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`
                                  flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors
                                  ${isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                `}
                            >
                                <item.icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                                {item.name}
                            </Link>
                        )
                    })}

                    {/* HUB EXPLOITATION */}
                    <div className="pt-6 pb-2">
                        <p className="px-3 text-[10px] font-black text-purple-500 uppercase tracking-widest">Exploitation Réseau</p>
                    </div>
                    {exploitationNav.filter(i => i.show).map((item) => {
                        const isActive = pathname === '/app/network'
                            ? (new URLSearchParams(window.location.search).get('tab') === (new URL(item.href, 'http://x').searchParams.get('tab')))
                            : pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`
                                  flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors
                                  ${isActive ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                `}
                            >
                                <item.icon size={18} className={isActive ? 'text-purple-600' : 'text-slate-400'} />
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
