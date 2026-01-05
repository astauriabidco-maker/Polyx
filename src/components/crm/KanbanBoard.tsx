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
}

export default function KanbanBoard({ leads, onLeadClick, onLeadUpdate }: KanbanBoardProps) {
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
                    <div key={stage.id} className="flex-shrink-0 w-80 flex flex-col h-full max-h-full bg-slate-100/50 rounded-xl border border-slate-200">
                        {/* Column Header */}
                        <div className="flex items-center gap-2 p-3 border-b border-slate-200 bg-white/50 backdrop-blur-sm rounded-t-xl shrink-0">
                            <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                            <span className="font-bold text-slate-700 text-sm">{stage.label}</span>
                            <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-full">
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
                                        flex-1 overflow-y-auto p-2 min-h-0
                                        ${snapshot.isDraggingOver
                                            ? 'bg-indigo-50/50'
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
                                                        bg-white rounded-lg p-3 mb-2 border border-slate-200 shadow-sm
                                                        hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all
                                                        ${snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-300 z-50' : ''}
                                                    `}
                                                >
                                                    {/* Lead Name */}
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <div className="shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                                                {lead.firstName[0]}{lead.lastName[0]}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-slate-900 text-sm truncate">
                                                                    {lead.firstName} {lead.lastName}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 truncate">
                                                                    {lead.source || 'N/A'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Badges Row */}
                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                            {lead.status}
                                                        </span>
                                                        {lead.city && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1">
                                                                <MapPin size={8} /> {lead.city}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Footer Info */}
                                                    <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-50">
                                                        <div className="flex items-center gap-1">
                                                            <Phone size={10} />
                                                            <span className="font-mono">{lead.phone}</span>
                                                        </div>
                                                        {/* Optional Debug: Date */}
                                                        {(lead as any).responseDate &&
                                                            <span className="text-[9px]">
                                                                {new Date((lead as any).responseDate).toLocaleDateString()}
                                                            </span>
                                                        }
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
