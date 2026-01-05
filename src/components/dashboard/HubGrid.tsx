'use client';

import React from 'react';
import { Lock, TrendingUp, Building2, ShieldCheck, UserCircle } from 'lucide-react';
import { OrgAccessDTO } from '@/lib/permissions';

interface HubGridProps {
    orgAccessList: OrgAccessDTO[];
    onSelectOrg?: (orgId: string) => void;
}

export function HubGrid({ orgAccessList, onSelectOrg }: HubGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {orgAccessList.map((access) => (
                <div
                    key={access.organisationId}
                    onClick={() => onSelectOrg?.(access.organisationId)}
                    className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
                >
                    {/* Top Banner Accent */}
                    <div className={`h-2 w-full ${getBadgeColorClass(access.computedPermissions.badgeColor)}`} />

                    <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-6">
                            {/* Org Logo / Placeholder */}
                            <div className="h-14 w-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-300">
                                <Building2 size={28} />
                            </div>

                            {/* Role Badge */}
                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm border ${getBadgeStyles(access.computedPermissions.badgeColor)}`}>
                                <ShieldCheck size={12} />
                                {access.role.replace('_', ' ')}
                            </div>
                        </div>

                        {/* Org Info */}
                        <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                            {access.organisationName}
                        </h3>
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
                            <UserCircle size={14} />
                            <span>Accès Personnel</span>
                        </div>

                        {/* Business Data Section */}
                        <div className="mt-auto pt-6 border-t border-slate-50">
                            {access.computedPermissions.canViewFinance ? (
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Chiffre d'Affaires (CA)</p>
                                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                                            {access.turnover ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(access.turnover) : '0 €'}
                                        </p>
                                    </div>
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                        <TrendingUp size={20} />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Lock size={16} />
                                        <span className="text-sm font-medium italic">Finance Masquée</span>
                                    </div>
                                    <div className="text-[9px] font-bold text-slate-300 uppercase">Restreint</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Hover Action Guide */}
                    <div className="bg-slate-50 py-3 px-6 text-center text-xs font-semibold text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        Accéder à l'Espace Pro →
                    </div>
                </div>
            ))}
        </div>
    );
}

// Helper for pure color classes (Tailwind)
function getBadgeColorClass(color: string) {
    switch (color) {
        case 'red': return 'bg-rose-500';
        case 'blue': return 'bg-blue-500';
        case 'green': return 'bg-emerald-500';
        case 'orange': return 'bg-orange-500';
        default: return 'bg-slate-500';
    }
}

// Helper for stylized badge (Tailwind)
function getBadgeStyles(color: string) {
    switch (color) {
        case 'red': return 'bg-rose-50 text-rose-600 border-rose-100';
        case 'blue': return 'bg-blue-50 text-blue-600 border-blue-100';
        case 'green': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        case 'orange': return 'bg-orange-50 text-orange-600 border-orange-100';
        default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
}
