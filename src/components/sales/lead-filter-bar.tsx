'use client';

import { Filter, Calendar, Users, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadStatus } from '@/domain/entities/lead';

export interface FilterState {
    orgName: string | 'ALL';
    status: LeadStatus | 'ALL';
    dateRange: 'ALL' | 'TODAY' | 'LAST_7_DAYS';
}

interface LeadFilterBarProps {
    availableOrgs: string[];
    filters: FilterState;
    onFilterChange: (newFilters: FilterState) => void;
}

export function LeadFilterBar({ availableOrgs, filters, onFilterChange }: LeadFilterBarProps) {

    const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onFilterChange({ ...filters, orgName: e.target.value });
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onFilterChange({ ...filters, status: e.target.value as LeadStatus | 'ALL' });
    };

    const handleDateChange = (val: 'ALL' | 'TODAY' | 'LAST_7_DAYS') => {
        onFilterChange({ ...filters, dateRange: val });
    };

    return (
        <div className="flex items-center gap-3 p-3 mb-4 bg-slate-900 border border-slate-800 rounded-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-indigo-400 mr-2">
                <Filter size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Filtres</span>
            </div>

            {/* Organization Filter */}
            <div className="relative">
                <Briefcase size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <select
                    value={filters.orgName}
                    onChange={handleOrgChange}
                    className="pl-8 pr-4 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer min-w-[140px]"
                >
                    <option value="ALL">Toutes les Orgs</option>
                    {availableOrgs.map(org => (
                        <option key={org} value={org}>{org}</option>
                    ))}
                </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
                <Users size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <select
                    value={filters.status}
                    onChange={handleStatusChange}
                    className="pl-8 pr-4 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer min-w-[140px]"
                >
                    <option value="ALL">Tous les Statuts</option>
                    <option value={LeadStatus.PROSPECT}>Prospect</option>
                    <option value={LeadStatus.PROSPECTION}>En Prospection</option>
                    <option value={LeadStatus.CONTACTED}>Contacté</option>
                    <option value={LeadStatus.QUALIFIED}>Qualifié</option>
                    <option value={LeadStatus.DISQUALIFIED}>Disqualifié</option>
                    <option value={LeadStatus.NRP}>NRP</option>
                </select>
            </div>

            {/* Date Quick Filters (Buttons) */}
            <div className="flex bg-slate-950 rounded-md border border-slate-700 p-0.5 ml-auto">
                <button
                    onClick={() => handleDateChange('ALL')}
                    className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${filters.dateRange === 'ALL' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Tout
                </button>
                <button
                    onClick={() => handleDateChange('TODAY')}
                    className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${filters.dateRange === 'TODAY' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Aujourd'hui
                </button>
                <button
                    onClick={() => handleDateChange('LAST_7_DAYS')}
                    className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${filters.dateRange === 'LAST_7_DAYS' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    7 Jours
                </button>
            </div>
        </div>
    );
}
