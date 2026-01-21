'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, ChevronRight, User, LayoutGrid, List, Clock } from 'lucide-react';
import { Lead, LeadStatus, SalesStage } from '@/domain/entities/lead';
import { getLeadsAction } from '@/application/actions/lead.actions';

import { PageGuide } from '@/components/ui/page-guide';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { useAuthStore } from '@/application/store/auth-store';
import { hydrateLeads } from '@/application/lib/date-utils';
import { SalesWorkflowWizard } from '@/components/crm/sales-workflow-wizard';
import KanbanBoard from '@/components/crm/KanbanBoard';
import { LeadDrawer } from '@/components/sales/lead-drawer';
export default function CrmPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Chargement du CRM...</div>}>
            <CrmContent />
        </Suspense>
    );
}

function CrmContent() {
    const { activeOrganization } = useAuthStore();
    const searchParams = useSearchParams();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Handle leadId from URL
    useEffect(() => {
        const leadId = searchParams.get('leadId');
        if (leadId && leads.length > 0) {
            const leadExists = leads.some(l => l.id === leadId);
            if (leadExists) {
                setSelectedLeadId(leadId);
            }
        }
    }, [searchParams, leads]);

    useEffect(() => {
        if (activeOrganization?.id) {
            loadLeads();
        }
    }, [activeOrganization?.id]);

    const loadLeads = async () => {
        if (!activeOrganization?.id) return;
        setIsLoading(true);

        const res = await getLeadsAction(activeOrganization.id);

        if (res.success && res.leads) {
            // Filter for CRM leads
            // Include:
            // - RDV_FIXE (New Appointment)
            // - PROSPECT + NOUVEAU (New Fresh Inbound)
            const qualified = res.leads.filter(l =>
                l.status === LeadStatus.RDV_FIXE ||
                (l.status === LeadStatus.PROSPECT && l.salesStage === SalesStage.NOUVEAU)
            );
            setLeads(hydrateLeads(qualified));
        } else {
            console.error('CRM: Fetch Failed', res.error);
        }
        setIsLoading(false);
    };

    const selectedLead = leads.find(l => l.id === selectedLeadId);

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Briefcase className="text-indigo-600" />
                        CRM / Closing Room
                    </h1>
                    <p className="text-slate-500">Gérez vos dossiers qualifiés et finalisez les ventes.</p>
                </div>
                <div className="flex items-center gap-4">
                    <PageGuide
                        title="Guide du CRM"
                        steps={[
                            { title: "Vue Liste vs Kanban", description: "Basculez entre la liste simple et le tableau par étapes de vente." },
                            { title: "Workflow de Vente", description: "Cliquez sur un dossier pour ouvrir l'assistant de clôture." },
                            { title: "Dossiers Qualifiés", description: "Ici n'apparaissent que les prospects ayant un RDV ou un fort potentiel." }
                        ]}
                    />
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <List size={16} /> Liste
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <LayoutGrid size={16} /> Kanban
                        </button>
                    </div>
                </div>
            </header>

            {viewMode === 'kanban' ? (
                <KanbanBoard
                    leads={leads as any}
                    onLeadClick={(lead) => {
                        setSelectedLeadId(lead.id);
                        setIsDrawerOpen(true);
                    }}
                    onLeadUpdate={loadLeads}
                />
            ) : (
                <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)]">

                    {/* Left: Queue List */}
                    <div className="col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h2 className="font-bold text-slate-700">Dossiers en cours ({leads.length})</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {isLoading ? (
                                <p className="text-center text-slate-400 p-4">Chargement...</p>
                            ) : leads.length === 0 ? (
                                <p className="text-center text-slate-400 p-4">Aucun dossier en cours.</p>
                            ) : (
                                leads.map(lead => (
                                    <div
                                        key={lead.id}
                                        onClick={() => setSelectedLeadId(lead.id)}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${selectedLeadId === lead.id ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-bold text-slate-900">{lead.firstName} {lead.lastName}</h3>
                                            {lead.salesStage ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-100 text-blue-700">
                                                    {lead.salesStage}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-green-100 text-green-700">
                                                    RDV FIXÉ
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 mb-2">{lead.email}</p>
                                        <div className="flex justify-between items-center text-xs text-slate-400">
                                            <span>{lead.city || 'Ville inconnue'}</span>
                                            <span className="flex items-center gap-1 font-medium text-indigo-600">
                                                {lead.nextCallbackAt ? `RDV: ${new Date(lead.nextCallbackAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : 'Pas de date'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Workflow Wizard */}
                    <div className="col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
                        {selectedLead ? (
                            <div className="flex-1 flex flex-col">
                                {/* Lead Header */}
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                            {selectedLead.firstName.charAt(0)}{selectedLead.lastName.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-lg text-slate-900">{selectedLead.firstName} {selectedLead.lastName}</h2>
                                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                                <span>Dossier #{selectedLead.id.slice(0, 8)} • {selectedLead.source}</span>
                                                {selectedLead.nextCallbackAt && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md font-bold text-[10px] uppercase">
                                                        <Clock size={12} />
                                                        RDV: {new Date(selectedLead.nextCallbackAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setIsDrawerOpen(true)}>
                                            <User size={16} className="mr-2" /> Voir fiche
                                        </Button>
                                    </div>
                                </div>

                                {/* Wizard Container */}
                                <div className="flex-1 overflow-y-auto bg-slate-50 flex items-start justify-center p-8">
                                    <div className="w-full max-w-3xl">
                                        <SalesWorkflowWizard
                                            lead={selectedLead}
                                            onUpdate={(updated) => setLeads(leads.map(l => l.id === updated.id ? updated : l))}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-400">
                                <p>Sélectionnez un dossier pour commencer le traitement.</p>
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* Lead Details Drawer */}
            <LeadDrawer
                lead={isDrawerOpen ? selectedLead as any : null}
                onClose={() => setIsDrawerOpen(false)}
                onUpdate={(updated) => {
                    setLeads(leads.map(l => l.id === updated.id ? updated : l));
                }}
            />
        </div>
    );
}
