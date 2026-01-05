'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { getAgenciesAction } from '@/application/actions/agency.actions';
import { Agency } from '@/domain/entities/agency';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export function AgencySwitcher() {
    const { activeOrganization, activeAgency, setActiveAgency } = useAuthStore();
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (activeOrganization?.id) {
            loadAgencies();
        }
    }, [activeOrganization?.id]);

    async function loadAgencies() {
        setIsLoading(true);
        const res = await getAgenciesAction(activeOrganization!.id);
        if (res.success && res.agencies) {
            setAgencies(res.agencies as Agency[]);
            // If no active agency or current active agency is not in the list, set the first one (optional)
            if (!activeAgency && res.agencies.length > 0) {
                // setActiveAgency(res.agencies[0] as Agency); // Auto-select first? Let's be explicit
            }
        }
        setIsLoading(false);
    }

    if (!activeOrganization) return null;

    return (
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
    );
}
