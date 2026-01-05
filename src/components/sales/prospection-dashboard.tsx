'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard,
    Headphones,
    Archive,
    Settings,
    Activity,
    Users,
    Phone,
    Clock,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Search,
    Globe,
    Layout,
    Filter
} from 'lucide-react';
import { Lead, LeadStatus, CallOutcome, RefusalReason, LeadWithOrg, SalesStage } from '@/domain/entities/lead';
import { getLeadsAction, updateLeadAction, getSalesRepsAction, bulkUpdateLeadsAction } from '@/application/actions/lead.actions'; // [UPDATED]
import { useAuthStore } from '@/application/store/auth-store';
import { hydrateLeads } from '@/application/lib/date-utils';
import { LeadService } from '@/application/services/lead.service';
import { KanbanBoard } from './kanban-board';
import { BulkActionBar } from './bulk-action-bar'; // [NEW]
import { LeadDrawer } from './lead-drawer';
import { CreateLeadModal } from './create-lead-modal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { AgentLeaderboard } from '@/components/analytics/agent-leaderboard';
import { SmartTimingWidget } from '@/components/analytics/smart-timing-widget';
import { KPICard } from '@/components/ui/kpi-card';
import { AgencyPerformanceStats } from '@/components/analytics/AgencyPerformanceStats';


// --- Sub-Components (Internal for Dashboard) ---

function SupervisionView({ leads, organisationId }: { leads: Lead[], organisationId: string }) {
    // Mock metrics calculation
    const totalLeads = leads.length;
    const answered = leads.filter(l => l.status === LeadStatus.CONTACTED || l.status === LeadStatus.QUALIFIED).length;
    const answerRate = totalLeads ? Math.round((answered / totalLeads) * 100) : 0;
    const pipelineValue = leads.filter(l => l.score > 50).length * 1500; // Mock CA

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Top KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard title="Volume Entrant" value={totalLeads.toString()} trend="+12%" trendDirection="up" icon={Users} />
                <KPICard title="CA Potentiel" value={`${(pipelineValue / 1000).toFixed(1)}k€`} trend="+5%" trendDirection="up" icon={TrendingUp} />
                <KPICard title="Taux Réponse" value={`${answerRate}%`} trend="-2%" trendDirection="down" icon={Phone} />
                <KPICard title="Délai Moyen" value="4h 12m" trend="-15m" trendDirection="up" icon={Clock} />
            </div>

            {/* Middle Row: Charts & AI */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                    <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                        <Activity className="text-indigo-500" />
                        Flux d'Activité & ROI
                    </h3>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-lg text-slate-600">
                        {/* Placeholder for Recharts - kept simple for this component */}
                        [Chart Visualization: ROI per Source]
                    </div>
                </div>
                <div className="space-y-6">
                    <SmartTimingWidget />
                    <AgentLeaderboard />
                </div>
            </div>

            {/* Bottom Row: Agency Breakdown (Only if admin and not unified view) */}
            <AgencyPerformanceStats organisationId={organisationId} />
        </div>
    );
}

function ArchivesView({ leads }: { leads: Lead[] }) {
    const disqualified = leads.filter(l => l.status === LeadStatus.DISQUALIFIED);

    const getByReason = (reason: RefusalReason) => {
        return disqualified.filter(l => {
            const lastLog = [...l.history].reverse().find(h => h.type === 'CALL_LOG' && h.details?.outcome === CallOutcome.REFUSAL);
            return lastLog?.details?.data?.refusalReason === reason;
        });
    };

    const reasons = [
        { id: RefusalReason.PRICE, label: 'Prix / Financement', color: 'border-red-500/20 bg-red-500/5 text-red-500' },
        { id: RefusalReason.COMPETITION, label: 'Concurrence', color: 'border-orange-500/20 bg-orange-500/5 text-orange-500' },
        { id: RefusalReason.NO_PROJECT, label: 'Pas de Projet', color: 'border-slate-500/20 bg-slate-500/5 text-slate-500' },
    ];

    return (
        <div className="overflow-x-auto h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-4 h-full min-w-[1000px]">
                {reasons.map(r => (
                    <div key={r.id} className={`flex-1 min-w-[300px] flex flex-col rounded-xl border ${r.color} backdrop-blur-sm`}>
                        <div className="p-4 border-b border-inherit font-bold flex justify-between items-center">
                            {r.label}
                            <span className="text-xs bg-slate-950/20 px-2 py-1 rounded">{getByReason(r.id).length}</span>
                        </div>
                        <div className="p-4 space-y-3 overflow-y-auto flex-1">
                            {getByReason(r.id).map(lead => (
                                <div key={lead.id} className="p-3 rounded bg-slate-900 border border-slate-800 shadow-sm hover:border-slate-700 transition-colors">
                                    <div className="font-medium text-slate-200">{lead.firstName} {lead.lastName}</div>
                                    <div className="text-xs text-slate-500 mt-1">{lead.source}</div>
                                    <div className="mt-2 text-xs flex gap-2">
                                        <span className="bg-slate-950 px-1.5 rounded text-slate-600 font-mono">ID: {lead.id}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ConfigView() {
    return (
        <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-8 animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
                <Settings className="text-indigo-500" />
                Configuration du Flux
            </h2>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Seuil de Scoring "Hot Lead"</label>
                    <div className="flex gap-4 items-center">
                        <input type="range" className="flex-1 accent-indigo-500 h-2 bg-slate-800 rounded-lg appearance-none" min="0" max="100" defaultValue="75" />
                        <span className="font-mono text-indigo-400 font-bold">75</span>
                    </div>
                    <p className="text-xs text-slate-500">Les leads au-dessus de ce score iront dans la file prioritaire.</p>
                </div>

                <div className="pt-4 border-t border-slate-800">
                    <h3 className="text-md font-semibold text-slate-200 mb-3">Règles d'Injection</h3>
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 text-slate-400 cursor-pointer">
                            <div className="w-10 h-6 bg-indigo-600 rounded-full relative"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow" /></div>
                            <span>Auto-Assignation aux agents connectés</span>
                        </label>
                        <label className="flex items-center gap-3 text-slate-400 cursor-pointer">
                            <div className="w-10 h-6 bg-indigo-600 rounded-full relative"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow" /></div>
                            <span>Priorité Webhook (Facebook Ads &gt; Google)</span>
                        </label>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                    <h3 className="text-md font-semibold text-slate-200 mb-3">Gestion des Données</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                            <h4 className="text-sm font-bold text-slate-300 mb-2">Export CSV</h4>
                            <p className="text-xs text-slate-500 mb-4">Télécharger l'intégralité de la base de leads active.</p>
                            <Button variant="outline" size="sm" className="w-full border-slate-700 hover:bg-slate-800 text-slate-300">
                                📥 Exporter
                            </Button>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                            <h4 className="text-sm font-bold text-slate-300 mb-2">Import CSV</h4>
                            <p className="text-xs text-slate-500 mb-4">Importer une liste de leads (fichier .csv).</p>
                            <Button variant="outline" size="sm" className="w-full border-slate-700 hover:bg-slate-800 text-slate-300">
                                📤 Importer
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="pt-6">
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-6">
                        Sauvegarder les paramètres
                    </Button>
                </div>
            </div>
        </div>
    );
}

// --- Main Dashboard Component ---

// --- Dynamic Filter Configuration ---
import { FieldDefinition, FilterGroup } from '@/domain/entities/filter';
import { FilterService } from '@/application/services/filter.service';
import { DynamicFilterBar } from '@/components/ui/dynamic-filter-bar';

const LEAD_FIELDS: FieldDefinition[] = [
    { id: 'firstName', label: 'Prénom', type: 'text' },
    { id: 'lastName', label: 'Nom', type: 'text' },
    { id: 'email', label: 'Email', type: 'text' },
    { id: 'phone', label: 'Téléphone', type: 'text' },
    { id: 'zipCode', label: 'Code Postal', type: 'text' },
    { id: 'city', label: 'Ville', type: 'text' },
    { id: 'score', label: 'Score IA', type: 'number' },
    { id: 'callAttempts', label: 'Tentatives', type: 'number' },
    { id: 'status', label: 'Statut Prospect', type: 'enum', options: Object.values(LeadStatus).map(s => ({ label: s, value: s })) },
    { id: 'salesStage', label: 'Étape de Vente', type: 'enum', options: Object.values(SalesStage).map(s => ({ label: s, value: s })) },
    { id: 'jobStatus', label: 'Situation Pro', type: 'text' },
    { id: 'source', label: 'Source', type: 'text' },
    { id: 'examId', label: 'Formation (Intérêt)', type: 'number' }, // Added as "Interests"
    { id: 'assignedUserId', label: 'Agent Assigné', type: 'text' },
    {
        id: 'smartQueue',
        label: 'Smart Queue',
        type: 'enum',
        options: [
            { label: '🎯 Flux entrant', value: 'provisioned' },
            { label: '🔥 Prioritaire', value: 'priority' },
            { label: '⏰ Rappel', value: 'callback' },
        ]
    },
    { id: 'createdAt', label: 'Date Création', type: 'date' },
    { id: 'updatedAt', label: 'Dernière Activité', type: 'date' },
];

// [REMOVED] ProspectionDashboardProps interface as we now fetch data internally
export default function ProspectionDashboard({ initialLeads }: { initialLeads?: Lead[] }) { // Made optional for backward compat
    const { activeOrganization, activeAgency } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'supervision' | 'cockpit' | 'archives' | 'config'>('cockpit');

    // Core Data State
    const [leads, setLeads] = useState<LeadWithOrg[]>(initialLeads ? (hydrateLeads(initialLeads) as LeadWithOrg[]) : []);
    const [isLoading, setIsLoading] = useState(false);

    // Unified View State
    const [isUnifiedView, setIsUnifiedView] = useState(false);

    const [selectedLead, setSelectedLead] = useState<LeadWithOrg | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [salesReps, setSalesReps] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        if (activeOrganization) {
            getSalesRepsAction(activeOrganization.id).then(res => {
                if (res.success && res.users) setSalesReps(res.users);
            });
        }
    }, [activeOrganization]);

    const handleBulkComplete = () => {
        loadLeads();
        setSelectedLeadIds([]);
    };

    const handleToggleSelect = (id: string) => {
        setSelectedLeadIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Fetch Leads Effect
    useEffect(() => {
        if (activeOrganization) {
            loadLeads();
        }
    }, [activeOrganization, isUnifiedView, activeAgency?.id]);

    // -- Dynamic Filtering Logic --
    const [filterGroup, setFilterGroup] = useState<FilterGroup>({
        id: 'root',
        conjunction: 'and',
        rules: []
    });

    const filteredLeads = useMemo(() => {
        // [HYBRID] Enrich with virtual smartQueue for dynamic filtering
        const enriched = leads.map(l => ({
            ...l,
            smartQueue: LeadService.getSmartQueueType(l)
        }));
        return FilterService.filterArray(enriched, filterGroup);
    }, [leads, filterGroup]);

    const loadLeads = async () => {
        if (!activeOrganization) return;
        setIsLoading(true);
        // Call Server Action
        const res = await getLeadsAction(activeOrganization.id, isUnifiedView, activeAgency?.id);
        if (res.success && res.leads) {
            setLeads(hydrateLeads(res.leads));
        }
        setIsLoading(false);
    };

    // Auto-Pilot Logic (Simplified adaptation from creating step)
    const [isAutoPilot, setIsAutoPilot] = useState(false);
    const [groupBy, setGroupBy] = useState<string>('default');

    const handleLeadUpdate = (updatedLead: Lead) => {
        const newLeads = leads.map(l => l.id === updatedLead.id ? updatedLead : l);
        setLeads(newLeads);

        // [PRECISION] Auto-Pilot now respects the Filtered set
        if (isAutoPilot && activeTab === 'cockpit') {
            // Wait for state to settle or use memory
            setTimeout(() => {
                // 1. Get filtered set (re-filter locally to avoid stale memo)
                const enriched = newLeads.map(l => ({
                    ...l,
                    smartQueue: LeadService.getSmartQueueType(l)
                }));
                const currentFiltered = FilterService.filterArray(enriched, filterGroup);

                // 2. Select next priority: Priority Queue first, then others
                const next = currentFiltered.find(l =>
                    l.id !== updatedLead.id &&
                    ![LeadStatus.QUALIFIED, LeadStatus.DISQUALIFIED, LeadStatus.ARCHIVED].includes(l.status as LeadStatus)
                );

                if (next) {
                    setSelectedLead(next as LeadWithOrg);
                } else {
                    setIsAutoPilot(false);
                    setSelectedLead(null);
                    // notify user or toast
                }
            }, 600);
        } else {
            setSelectedLead(updatedLead as LeadWithOrg);
        }
    };

    const navItems = [
        { id: 'supervision', label: 'Supervision', icon: LayoutDashboard },
        { id: 'cockpit', label: 'Cockpit Opérationnel', icon: Headphones },
        { id: 'archives', label: 'Archives', icon: Archive },
        { id: 'config', label: 'Configuration', icon: Settings },
    ] as const;

    return (
        <div className="absolute inset-0 flex flex-col bg-slate-950 text-slate-50 overflow-hidden font-sans selection:bg-indigo-500/30">

            {/* 1. Top Navigation Bar (Control Tower Style) */}
            <header className="flex-none h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md flex items-center px-6 justify-between z-20">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Activity size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
                            Polyx <span className="text-indigo-400">Control Tower</span>
                            {activeAgency && (
                                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 ml-2">
                                    📍 {activeAgency.name}
                                </span>
                            )}
                        </h1>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-mono tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            {activeAgency ? `Connecté à ${activeAgency.name}` : 'Connecté au réseau global'}
                        </div>
                    </div>
                </div>

                <nav className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === item.id
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                        >
                            <item.icon size={16} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="flex items-center gap-4">
                    {/* Unified View Toggle */}
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsUnifiedView(false)}
                            className={`text-xs h-7 ${!isUnifiedView ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Activity size={12} className="mr-1" />
                            OF Actif
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsUnifiedView(true)}
                            className={`text-xs h-7 ${isUnifiedView ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Globe size={12} className="mr-1" />
                            Vue Unifiée
                        </Button>
                    </div>

                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input
                            type="text"
                            placeholder="Global Search..."
                            className="bg-slate-900 border border-slate-800 rounded-full pl-9 pr-4 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-64 transition-colors placeholder:text-slate-600"
                        />
                    </div>

                    <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                        onClick={() => setShowCreateModal(true)}
                    >
                        + Nouveau Lead
                    </Button>
                </div>
            </header>

            {/* 2. Main Workspace */}
            <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">

                {/* Background Grid Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-20" />

                <div className="flex-1 flex flex-col min-h-0 relative z-10">
                    {activeTab === 'supervision' && <div className="h-full overflow-y-auto p-6"><SupervisionView leads={leads} organisationId={activeOrganization!.id} /></div>}

                    {activeTab === 'cockpit' && (
                        <div className="h-full flex flex-col animate-in fade-in duration-300 min-h-0 p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                    <Headphones size={24} className="text-indigo-400" />
                                    Cockpit Agent
                                </h2>
                                <Button
                                    variant={isAutoPilot ? "primary" : "outline"}
                                    onClick={() => setIsAutoPilot(!isAutoPilot)}
                                    className={`${isAutoPilot
                                        ? 'bg-indigo-600 hover:bg-indigo-500 border-transparent text-white ring-2 ring-indigo-500/20'
                                        : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'} transition-all h-10 px-4 flex items-center gap-2`}
                                >
                                    <div className="relative">
                                        <span className={`block w-2 h-2 rounded-full ${isAutoPilot ? 'bg-white' : 'bg-slate-500'}`} />
                                        {isAutoPilot && <span className="absolute inset-0 block w-2 h-2 rounded-full bg-white animate-ping" />}
                                    </div>
                                    <span className="font-bold tracking-wide uppercase text-[11px]">
                                        {isAutoPilot
                                            ? (filterGroup.rules.length > 0 ? '✈️ Auto-Pilote (Mode Segmenté)' : '✈️ Auto-Pilote Actif')
                                            : '✈️ Activer Auto-Pilote'}
                                    </span>
                                </Button>
                            </div>

                            {/* Universal Dynamic Filter Bar */}
                            <DynamicFilterBar
                                moduleId="prospection"
                                fields={LEAD_FIELDS}
                                onFilterChange={setFilterGroup}
                                currentGroupBy={groupBy}
                                onGroupByChange={setGroupBy}
                            />

                            {/* [HYBRID] Filter Summary Info */}
                            {filterGroup.rules.length > 0 && (
                                <div className="mt-2 flex items-center gap-2 px-1">
                                    <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg">
                                        <Filter size={12} className="text-indigo-400" />
                                        <span className="text-[10px] text-indigo-300 font-medium">
                                            {filteredLeads.length} résultats sur {leads.length} au total
                                        </span>
                                        <div className="w-px h-3 bg-indigo-500/20 mx-1" />
                                        <button
                                            onClick={() => setSelectedLeadIds(filteredLeads.map(l => l.id))}
                                            className="text-[10px] text-indigo-400 hover:text-white transition-colors"
                                        >
                                            Tout sélectionner
                                        </button>
                                        <div className="w-px h-3 bg-indigo-500/20 mx-1" />
                                        <button
                                            onClick={() => setFilterGroup({ id: 'root', conjunction: 'and', rules: [] })}
                                            className="text-[10px] text-indigo-400 hover:text-white underline transition-colors"
                                        >
                                            Effacer tout
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-hidden min-h-0 mt-4 rounded-xl border border-slate-800/50 bg-slate-900/50 backdrop-blur-sm p-1">
                                {isLoading ? (
                                    <div className="flex h-full items-center justify-center text-slate-500">
                                        Scan du réseau en cours...
                                    </div>
                                ) : (
                                    <KanbanBoard
                                        leads={filteredLeads}
                                        allLeads={leads}
                                        onLeadClick={setSelectedLead}
                                        isUnifiedView={isUnifiedView}
                                        groupBy={groupBy}
                                        selectedIds={selectedLeadIds}
                                        onToggleSelect={handleToggleSelect}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'archives' && (
                        <div className="h-full overflow-hidden p-6">
                            <ArchivesView leads={leads} />
                        </div>
                    )}

                    {activeTab === 'config' && (
                        <div className="h-full overflow-y-auto p-6">
                            <ConfigView />
                        </div>
                    )}
                </div>
            </main>

            {/* 3. Operational Drawer (Overlay) */}
            <LeadDrawer
                key={selectedLead?.id}
                lead={selectedLead}
                onClose={() => setSelectedLead(null)}
                onUpdate={handleLeadUpdate}
            />

            {/* 4. Create Modal */}
            {showCreateModal && activeOrganization && (
                <CreateLeadModal
                    organizationId={activeOrganization.id}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={(newLead) => {
                        const leadWithOrg = { ...newLead, organizationName: activeOrganization.name };
                        setLeads(prev => [leadWithOrg, ...prev]);
                        // Optional: Navigate to cockpit or notify
                        alert('Lead créé avec succès !');
                    }}
                />
            )}

            {/* [NEW] Bulk Action Bar */}
            <BulkActionBar
                selectedIds={selectedLeadIds}
                onClear={() => setSelectedLeadIds([])}
                onActionComplete={handleBulkComplete}
                bulkUpdateAction={bulkUpdateLeadsAction}
                salesReps={salesReps}
            />
        </div>
    );
}
