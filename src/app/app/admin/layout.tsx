'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Building2,
    MapPin,
    Users,
    ShieldCheck,
    Globe,
    ChevronRight,
    Sparkles
} from 'lucide-react';
import { checkIsGlobalAdminAction } from '@/application/actions/auth.actions';
import { cn } from '@/lib/utils';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

    useEffect(() => {
        checkIsGlobalAdminAction().then(setIsGlobalAdmin);
    }, []);

    const navItems = [
        { label: 'Vue d\'ensemble', href: '/app/admin', icon: LayoutDashboard },
        { label: 'Profil & Identité', href: '/app/admin/profile', icon: Building2 },
        { label: 'Agences', href: '/app/admin/agencies', icon: MapPin },
        { label: 'Équipes & Accès', href: '/app/admin/teams', icon: Users },
    ];

    return (
        <div className="flex h-full bg-white">
            {/* SUB-SIDEBAR INTERNAL */}
            <aside className="w-64 border-r border-slate-100 flex flex-col bg-slate-50/50">
                <div className="p-6">
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                        <ShieldCheck size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Administration</span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Gestion OF</h2>
                </div>

                <nav className="flex-1 px-3 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all group",
                                    isActive
                                        ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon size={18} className={cn(isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                                    {item.label}
                                </div>
                                {isActive && <ChevronRight size={14} />}
                            </Link>
                        );
                    })}

                    {isGlobalAdmin && (
                        <div className="mt-8 pt-6 border-t border-slate-200">
                            <p className="px-4 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Maintenance Plateforme</p>
                            <Link
                                href="/app/admin/nexus"
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all group",
                                    pathname === '/app/admin/nexus'
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                                        : "text-indigo-600 hover:bg-indigo-50"
                                )}
                            >
                                <Globe size={18} />
                                Nexus Master
                            </Link>
                        </div>
                    )}
                </nav>

                <div className="p-4 bg-indigo-50/50 m-4 rounded-2xl border border-indigo-100/50">
                    <div className="flex items-center gap-2 text-indigo-700 mb-1">
                        <Sparkles size={14} />
                        <span className="text-[10px] font-bold uppercase">Aide Admin</span>
                    </div>
                    <p className="text-[11px] text-indigo-600/80 leading-relaxed font-medium">
                        Configurez votre organisme et vos agences ici.
                    </p>
                </div>
            </aside>

            {/* CONTENT AREA */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
