'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Phone, User, MapPin } from 'lucide-react';
import { updateLeadAction } from '@/application/actions/lead.actions';

// Lead Status Pipeline Order
const PIPELINE_STAGES = [
    { id: 'NOUVEAU', label: 'Nouveau', color: 'bg-blue-500' },
    { id: 'PROSPECT', label: 'Prospect', color: 'bg-indigo-500' },
    { id: 'RDV_FIXE', label: 'RDV Fixé', color: 'bg-purple-500' },
    { id: 'EN_CLOSING', label: 'En Closing', color: 'bg-amber-500' },
    { id: 'SIGNE', label: 'Signé', color: 'bg-green-500' },
    { id: 'PERDU', label: 'Perdu', color: 'bg-slate-400' },
];

interface Lead {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    city?: string;
    status: string;
    source?: string;
}

interface KanbanBoardProps {
    leads: Lead[];
    onLeadClick?: (lead: Lead) => void;
    onLeadUpdate?: () => void;
    selectedIds?: string[];
    onToggleSelect?: (id: string, multi?: boolean) => void;
    groupBy?: string;
    allLeads?: Lead[]; // Optim for filtering
}

export default function KanbanBoard({ leads, onLeadClick, onLeadUpdate, selectedIds, onToggleSelect }: KanbanBoardProps) {
    const [columns, setColumns] = useState<Record<string, Lead[]>>({});

    useEffect(() => {
        // Group leads by status
        const grouped: Record<string, Lead[]> = {};
        PIPELINE_STAGES.forEach(stage => {
            grouped[stage.id] = leads.filter(lead => lead.status === stage.id);
        });
        setColumns(grouped);
    }, [leads]);

    async function handleDragEnd(result: DropResult) {
        const { source, destination, draggableId } = result;

        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const leadId = draggableId;
        const newStatus = destination.droppableId;

        // Optimistic update
        const newColumns = { ...columns };
        const [movedLead] = newColumns[source.droppableId].splice(source.index, 1);
        movedLead.status = newStatus;
        newColumns[destination.droppableId].splice(destination.index, 0, movedLead);
        setColumns(newColumns);

        // Server update
        const result2 = await updateLeadAction(leadId, { status: newStatus as any });

        if (!result2.success) {
            // Revert on failure
            console.error('Failed to update lead status');
            onLeadUpdate?.();
        }
    }

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto h-full pb-2">
                {PIPELINE_STAGES.map((stage) => (
                    <div key={stage.id} className="flex-shrink-0 w-80 flex flex-col h-full max-h-full bg-slate-950 rounded-xl border border-slate-800/50">
                        {/* Column Header */}
                        <div className="flex items-center gap-2 p-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm rounded-t-xl shrink-0">
                            <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                            <span className="font-bold text-slate-300 text-sm">{stage.label}</span>
                            <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                                {columns[stage.id]?.length || 0}
                            </span>
                        </div>

                        {/* Column Content - Scrollable Area */}
                        <Droppable droppableId={stage.id}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`
                                        flex-1 overflow-y-auto p-2 min-h-0 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent
                                        ${snapshot.isDraggingOver
                                            ? 'bg-slate-800/50'
                                            : ''
                                        }
                                    `}
                                >
                                    {columns[stage.id]?.map((lead, index) => (
                                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    onClick={() => onLeadClick?.(lead)}
                                                    className={`
                                                        bg-slate-900 rounded-lg p-3 mb-2 border border-slate-800 shadow-sm
                                                        hover:border-indigo-500/50 hover:bg-slate-800 cursor-pointer transition-all
                                                        ${selectedIds?.includes(lead.id) ? 'ring-2 ring-indigo-500 border-indigo-500 bg-slate-800' : ''}
                                                        ${snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-500 z-50 bg-slate-800' : ''}
                                                    `}
                                                >
                                                    {/* Selection Checkbox Overlay (Hover only) */}
                                                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {onToggleSelect && (
                                                            <div
                                                                className={`w-4 h-4 rounded border border-slate-600 ${selectedIds?.includes(lead.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-800'}`}
                                                                onClick={(e) => { e.stopPropagation(); onToggleSelect(lead.id); }}
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Lead Name */}
                                                    <div className="flex justify-between items-start mb-2 relative group">
                                                        <div className="flex items-center gap-2 overflow-hidden w-full">
                                                            <div className="shrink-0 h-8 w-8 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center text-xs font-bold">
                                                                {lead.firstName[0]}{lead.lastName[0]}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-semibold text-slate-200 text-sm truncate">
                                                                    {lead.firstName} {lead.lastName}
                                                                </p>
                                                                <p className="text-[10px] text-slate-500 truncate">
                                                                    {lead.source || 'N/A'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Badges Row */}
                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                        {lead.city && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                                                                <MapPin size={8} /> {lead.city}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Footer Info */}
                                                    <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-800">
                                                        <div className="flex items-center gap-1">
                                                            <Phone size={10} />
                                                            <span className="font-mono">{lead.phone}</span>
                                                        </div>
                                                        {/* Score Indicator */}
                                                        {(lead as any).score && (
                                                            <div className="flex items-center gap-1">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${(lead as any).score > 70 ? 'bg-green-500' : 'bg-amber-500'}`} />
                                                                <span className="font-mono">{(lead as any).score}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                ))}
            </div>
        </DragDropContext>
    );
}
