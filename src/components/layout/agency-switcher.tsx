'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { getAgenciesAction } from '@/application/actions/agency.actions';
import { Agency } from '@/domain/entities/agency';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Globe, ChevronRight } from 'lucide-react';

export function AgencySwitcher() {
    const {
        activeOrganization,
        activeAgency,
        setActiveAgency,
        isNexusMode,
        setNexusMode,
        accessibleOrgs
    } = useAuthStore();
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (activeOrganization?.id && !isNexusMode) {
            loadAgencies();
        }
    }, [activeOrganization?.id, isNexusMode]);

    async function loadAgencies() {
        setIsLoading(true);
        const res = await getAgenciesAction(activeOrganization!.id);
        if (res.success && res.agencies) {
            setAgencies(res.agencies as Agency[]);
        }
        setIsLoading(false);
    }

    if (!activeOrganization) return null;

    const hasMultipleOrgs = accessibleOrgs.length > 1;

    return (
        <div className="space-y-2">
            {/* Nexus Mode Toggle (only shown if user has access to multiple orgs) */}
            {hasMultipleOrgs && (
                <div className="px-3 py-2">
                    <button
                        onClick={() => setNexusMode(!isNexusMode)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${isNexusMode
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                                : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200'
                            }`}
                    >
                        <Globe size={14} />
                        <span className="flex-1 text-left">
                            {isNexusMode ? 'Mode Nexus Actif' : 'Activer Vue Consolidée'}
                        </span>
                        {isNexusMode && (
                            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                                {accessibleOrgs.length} OF
                            </span>
                        )}
                    </button>
                    {isNexusMode && (
                        <p className="text-[10px] text-indigo-600 px-1 mt-1">
                            Données de tous vos OF affichées
                        </p>
                    )}
                </div>
            )}

            {/* Agency Switcher (hidden in Nexus mode) */}
            {!isNexusMode && (
                <div className="px-3 py-2">
                    <div className="flex items-center gap-2 mb-2 px-1">
                        <Building2 size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Agence Active</span>
                    </div>
                    <Select
                        value={activeAgency?.id || 'all'}
                        onValueChange={(value) => {
                            if (value === 'all') {
                                setActiveAgency(null);
                            } else {
                                const agency = agencies.find(a => a.id === value);
                                if (agency) setActiveAgency(agency);
                            }
                        }}
                    >
                        <SelectTrigger className="h-9 bg-slate-50 border-slate-200 text-xs font-semibold focus:ring-indigo-500">
                            <SelectValue placeholder="Toutes les agences" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs font-medium">Toutes les agences</SelectItem>
                            {agencies.map((agency) => (
                                <SelectItem key={agency.id} value={agency.id} className="text-xs font-medium">
                                    {agency.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    );
}
