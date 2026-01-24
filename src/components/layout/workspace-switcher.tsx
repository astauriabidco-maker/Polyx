'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { getAgenciesAction } from '@/application/actions/agency.actions';
import { switchOrganizationAction } from '@/application/actions/auth.actions';
import { Agency } from '@/domain/entities/agency';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronsUpDown, Globe, Building2, MapPin, Check, Plus, LogOut, LayoutGrid, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export function WorkspaceSwitcher() {
    const router = useRouter();
    const { toast } = useToast();
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
        if (activeOrganization?.id) {
            loadAgencies();
        }
    }, [activeOrganization?.id]);

    async function loadAgencies() {
        if (!activeOrganization?.id) return;
        setIsLoading(true);
        const res = await getAgenciesAction(activeOrganization.id);
        if (res.success && res.agencies) {
            setAgencies(res.agencies as Agency[]);
        }
        setIsLoading(false);
    }

    async function handleSwitchOrg(orgId: string) {
        if (orgId === activeOrganization?.id) return;

        const res = await switchOrganizationAction(orgId);
        if (res.success) {
            window.location.href = '/app/dashboard'; // Hard refresh to ensure clean context
        } else {
            toast({
                title: "Erreur",
                description: res.error || "Impossible de changer d'organisation",
                variant: "destructive"
            });
        }
    }

    if (!activeOrganization) return null;

    const hasMultipleOrgs = accessibleOrgs.length > 1;

    // Logic: Separate Organization Switcher (Context) and Agency Filter (View)

    return (
        <div className="flex flex-col gap-1 w-full">
            {/* 1. ORGANIZATION CONTEXT SWITCHER */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className={cn(
                        "w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors group",
                        !hasMultipleOrgs && "cursor-default hover:bg-transparent"
                    )}>
                        <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                            {activeOrganization.name[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col items-start min-w-0 flex-1">
                            <div className="flex items-center gap-1 w-full">
                                <span className="text-sm font-bold text-slate-900 truncate">
                                    {activeOrganization.name}
                                </span>
                                {hasMultipleOrgs && (
                                    <ChevronsUpDown size={12} className="text-slate-400 group-hover:text-slate-600" />
                                )}
                            </div>
                            <span className="text-[10px] text-slate-500 truncate">
                                {isNexusMode ? "Vue Consolidée (Nexus)" : "Espace de travail"}
                            </span>
                        </div>
                    </button>
                </DropdownMenuTrigger>

                {hasMultipleOrgs && (
                    <DropdownMenuContent className="w-64" align="start" sideOffset={8}>
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-2 py-1.5">
                            Changer d'organisation
                        </DropdownMenuLabel>
                        <DropdownMenuGroup>
                            {accessibleOrgs.map(org => (
                                <DropdownMenuItem
                                    key={org.id}
                                    onClick={() => handleSwitchOrg(org.id)}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <Building size={16} className={org.id === activeOrganization.id ? "text-indigo-600" : "text-slate-400"} />
                                    <span className={cn("flex-1 text-sm", org.id === activeOrganization.id && "font-medium")}>
                                        {org.name}
                                    </span>
                                    {org.id === activeOrganization.id && <Check size={14} className="text-indigo-600" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push('/hub')} className="gap-2 cursor-pointer">
                            <LayoutGrid size={14} className="text-slate-500" />
                            <span className="text-xs">Voir toutes les organisations</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                )}
            </DropdownMenu>

            {/* 2. AGENCY FILTER SELECTOR (Only if NOT in Nexus Mode) */}
            {!isNexusMode && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="w-full flex items-center justify-between px-2 py-1.5 ml-1 rounded-md hover:bg-slate-50 group border border-transparent hover:border-slate-100 transition-all">
                            <div className="flex items-center gap-2 min-w-0">
                                <MapPin size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                <span className="text-xs font-medium text-slate-600 truncate">
                                    {activeAgency ? activeAgency.name : "Toutes les agences"}
                                </span>
                            </div>
                            <ChevronsUpDown size={12} className="text-slate-300 group-hover:text-slate-500" />
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent className="w-56" align="start" sideOffset={4}>
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-2 py-1.5">
                            Filtrer par agence
                        </DropdownMenuLabel>

                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                onClick={() => setActiveAgency(null)}
                                className={cn(
                                    "flex items-center gap-2 cursor-pointer",
                                    !activeAgency ? "bg-slate-50 text-indigo-700" : ""
                                )}
                            >
                                <div className={cn(
                                    "w-4 h-4 border rounded flex items-center justify-center transition-colors",
                                    !activeAgency ? "bg-indigo-600 border-indigo-600" : "border-slate-300"
                                )}>
                                    {!activeAgency && <Check size={10} className="text-white" />}
                                </div>
                                <span className="text-xs font-medium">Toutes les agences</span>
                            </DropdownMenuItem>

                            {agencies.length === 0 && (
                                <div className="px-2 py-2 text-[10px] text-slate-400 italic">
                                    Aucune agence configurée
                                </div>
                            )}

                            <div className="max-h-[200px] overflow-y-auto mt-1 space-y-0.5">
                                {agencies.map(agency => (
                                    <DropdownMenuItem
                                        key={agency.id}
                                        onClick={() => setActiveAgency(agency)}
                                        className={cn(
                                            "flex items-center gap-2 cursor-pointer",
                                            activeAgency?.id === agency.id ? "bg-slate-50 text-indigo-700" : ""
                                        )}
                                    >
                                        <div className={cn(
                                            "w-4 h-4 border rounded flex items-center justify-center transition-colors",
                                            activeAgency?.id === agency.id ? "bg-indigo-600 border-indigo-600" : "border-slate-300"
                                        )}>
                                            {activeAgency?.id === agency.id && <Check size={10} className="text-white" />}
                                        </div>
                                        <span className="text-xs">{agency.name}</span>
                                    </DropdownMenuItem>
                                ))}
                            </div>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {/* 3. NEXUS TOGGLE (Global Admins Only - Discrete) */}
            {hasMultipleOrgs && (
                <div className="px-2">
                    <button
                        onClick={() => setNexusMode(!isNexusMode)}
                        className={cn(
                            "w-full flex items-center gap-2 py-1 px-2 rounded text-[10px] uppercase font-bold tracking-wider transition-colors border",
                            isNexusMode
                                ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                                : "text-slate-400 border-transparent hover:text-indigo-500 hover:bg-slate-50"
                        )}
                    >
                        <Globe size={12} />
                        {isNexusMode ? "Mode Nexus Actif" : "Passer en Vue Nexus"}
                    </button>
                </div>
            )}
        </div>
    );
}
