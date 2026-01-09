'use client';

import { Lead, LeadWithOrg } from '@/domain/entities/lead';
import { LeadService } from '@/application/services/lead.service';
import { LeadCard } from './lead-card';
import { GroupingService, DataGroup } from '@/application/services/grouping.service';

interface KanbanBoardProps {
    leads: LeadWithOrg[];
    allLeads?: LeadWithOrg[]; // [NEW] Total leads for ratios
    onLeadClick: (lead: LeadWithOrg) => void;
    isUnifiedView?: boolean;
    groupBy?: string;
    selectedIds?: string[]; // [NEW] Multi-select
    onToggleSelect?: (id: string) => void; // [NEW]
}

export function KanbanBoard({ leads, allLeads = [], onLeadClick, isUnifiedView, groupBy = 'default', selectedIds = [], onToggleSelect }: KanbanBoardProps) {
    let columns: DataGroup<LeadWithOrg>[] = [];
    let totalColumns: DataGroup<LeadWithOrg>[] = [];

    if (groupBy === 'default') {
        columns = [
            { id: 'provisioned', title: 'Flux Entrant', items: LeadService.getProvisionedQueue(leads) },
            { id: 'priority', title: 'Prioritaires (IA)', items: LeadService.getPriorityQueue(leads) },
            { id: 'callbacks', title: 'Rappels', items: LeadService.getCallbackQueue(leads) }
        ];
        totalColumns = [
            { id: 'provisioned', title: 'Flux Entrant', items: LeadService.getProvisionedQueue(allLeads) },
            { id: 'priority', title: 'Prioritaires (IA)', items: LeadService.getPriorityQueue(allLeads) },
            { id: 'callbacks', title: 'Rappels', items: LeadService.getCallbackQueue(allLeads) }
        ];
    } else if (groupBy === 'pipeline') {
        const pipelineStages = [
            { id: 'NOUVEAU', title: 'Nouveau Lead', filter: (l: Lead) => l.salesStage === 'NOUVEAU' || l.score > 80 },
            { id: 'EN_COURS', title: 'En cours', filter: (l: Lead) => (l.status === 'PROSPECTION' || l.status === 'CONTACTED') && l.salesStage !== 'NOUVEAU' },
            { id: 'RELANCES', title: 'Relances / NRP', filter: (l: Lead) => l.status === 'ATTEMPTED' || l.status === 'NRP' },
            { id: 'RDV_FIXE', title: 'RDV Validé', filter: (l: Lead) => l.status === 'RDV_FIXE' || l.salesStage === 'RDV_FIXE' }
        ];

        columns = pipelineStages.map(stage => ({
            id: stage.id,
            title: stage.title,
            items: leads.filter(stage.filter)
        }));

        totalColumns = pipelineStages.map(stage => ({
            id: stage.id,
            title: stage.title,
            items: allLeads.filter(stage.filter)
        }));
    } else {
        columns = GroupingService.groupBy(leads, groupBy as keyof Lead);
        totalColumns = GroupingService.groupBy(allLeads, groupBy as keyof Lead);
    }

    return (
        <div className="flex gap-6 h-full overflow-x-auto pb-4 custom-scrollbar">
            {columns.map(col => {
                const totalCol = totalColumns.find(tc => tc.id === col.id);
                const totalCount = totalCol?.items.length || 0;
                const isFiltered = totalCount > col.items.length;

                return (
                    <div key={col.id} className={`flex flex-col rounded-xl border h-full min-h-0 min-w-[320px] max-w-[380px] ${groupBy === 'default' && col.id === 'priority' ? 'bg-indigo-500/5 border-indigo-500/20' :
                        groupBy === 'default' && col.id === 'callbacks' ? 'bg-orange-500/5 border-orange-500/20' :
                            'bg-slate-900/50 border-slate-800/50'
                        }`}>
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/30 rounded-t-xl shrink-0">
                            <h3 className={`font-semibold text-sm ${groupBy === 'default' && col.id === 'priority' ? 'text-indigo-400' :
                                groupBy === 'default' && col.id === 'callbacks' ? 'text-orange-400' :
                                    'text-slate-300'
                                }`}>{col.title}</h3>

                            <div className="flex items-center gap-2">
                                {isFiltered && (
                                    <span className="text-[10px] text-slate-500 font-medium">Filtré :</span>
                                )}
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${isFiltered ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-800 text-slate-400'}`}>
                                    {col.items.length}
                                    {isFiltered && <span className="opacity-50 ml-1">/ {totalCount}</span>}
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                            {col.items.map(lead => (
                                <LeadCard
                                    key={lead.id}
                                    lead={lead}
                                    onClick={() => onLeadClick(lead)}
                                    isUnified={isUnifiedView}
                                    isSelected={selectedIds.includes(lead.id)}
                                    onToggleSelect={onToggleSelect}
                                />
                            ))}
                            {col.items.length === 0 && <EmptyState label={`Aucun lead dans ${col.title}`} />}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="h-32 flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
            {label}
        </div>
    );
}
