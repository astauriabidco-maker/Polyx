'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ListChecks, Database, Sparkles, Tags } from 'lucide-react';

const STUDIO_NAV = [
    { href: '/app/dashboard/studio/tests', label: 'Tests', icon: ListChecks, description: 'Configuration templates' },
    { href: '/app/dashboard/studio/questions', label: 'Banque', icon: Database, description: 'Questions' },
    { href: '/app/dashboard/studio/generation', label: 'Génération IA', icon: Sparkles, description: 'Atelier création' },
    { href: '/app/dashboard/studio/themes', label: 'Thématiques', icon: Tags, description: 'Contexte IA' },
];

export default function StudioLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex h-full">
            {/* Sidebar Navigation */}
            <aside className="w-56 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100">
                    <h1 className="text-lg font-bold text-slate-900">Assessment Studio</h1>
                    <p className="text-xs text-slate-500">Conception & gestion</p>
                </div>
                <nav className="flex-1 p-2 space-y-1">
                    {STUDIO_NAV.map(item => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive
                                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                <item.icon size={18} className={isActive ? 'text-indigo-500' : 'text-slate-400'} />
                                <div>
                                    <div className="font-medium">{item.label}</div>
                                    <div className="text-xs text-slate-400">{item.description}</div>
                                </div>
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 to-slate-100">
                {children}
            </main>
        </div>
    );
}
