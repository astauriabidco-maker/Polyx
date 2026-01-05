'use client';

import { useState } from 'react';
import { UserPlus, Archive, CheckSquare, X, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadStatus, SalesStage } from '@/domain/entities/lead';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface BulkActionBarProps {
    selectedIds: string[];
    onClear: () => void;
    onActionComplete: () => void;
    bulkUpdateAction: (ids: string[], updates: any) => Promise<{ success: boolean; error?: string }>;
    salesReps: { id: string; name: string }[];
}

export function BulkActionBar({ selectedIds, onClear, onActionComplete, bulkUpdateAction, salesReps }: BulkActionBarProps) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [actionType, setActionType] = useState<string | null>(null);

    const handleBulkAction = async (updates: any) => {
        setIsUpdating(true);
        const res = await bulkUpdateAction(selectedIds, updates);
        if (res.success) {
            onActionComplete();
            onClear();
        } else {
            alert(res.error || "Erreur lors de la mise à jour groupée");
        }
        setIsUpdating(false);
        setActionType(null);
    };

    if (selectedIds.length === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-slate-900 border border-indigo-500/30 shadow-2xl shadow-indigo-500/20 rounded-2xl px-6 py-4 flex items-center gap-6 backdrop-blur-xl bg-opacity-90">

                <div className="flex items-center gap-3 pr-6 border-r border-slate-800">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
                        {selectedIds.length}
                    </div>
                    <div>
                        <div className="text-sm font-bold text-white leading-none">Leads sélectionnés</div>
                        <button onClick={onClear} className="text-[10px] text-slate-500 hover:text-red-400 mt-1 flex items-center gap-1">
                            <X size={10} /> Tout désélectionner
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Bulk Assign */}
                    <Select onValueChange={(val) => handleBulkAction({ assignedUserId: val })}>
                        <SelectTrigger className="w-44 h-10 bg-slate-950/50 border-slate-700 text-xs text-slate-300 hover:border-indigo-500/50 transition-colors">
                            <UserPlus size={14} className="mr-2 text-indigo-400" />
                            <SelectValue placeholder="Assigner à..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                            {salesReps.map(rep => (
                                <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Bulk Status */}
                    <Select onValueChange={(val) => handleBulkAction({ status: val })}>
                        <SelectTrigger className="w-44 h-10 bg-slate-950/50 border-slate-700 text-xs text-slate-300 hover:border-emerald-500/50 transition-colors">
                            <CheckSquare size={14} className="mr-2 text-emerald-400" />
                            <SelectValue placeholder="Changer Statut" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                            {Object.values(LeadStatus).map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Quick Archive */}
                    <Button
                        variant="outline"
                        onClick={() => handleBulkAction({ status: LeadStatus.ARCHIVED })}
                        disabled={isUpdating}
                        className="h-10 px-4 border-slate-700 text-slate-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                    >
                        {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} className="mr-2" />}
                        Archiver tout
                    </Button>
                </div>
            </div>
        </div>
    );
}
