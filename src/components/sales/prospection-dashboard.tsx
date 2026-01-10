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
    Search,
    LayoutGrid,
    List as ListIcon,
    Plus
} from 'lucide-react';
import { Lead, LeadStatus, LeadWithOrg } from '@/domain/entities/lead';
import { Role } from '@/domain/entities/permission';
import { getLeadsAction, bulkUpdateLeadsAction, getSalesRepsAction } from '@/application/actions/lead.actions';
import { useAuthStore } from '@/application/store/auth-store';
import { hydrateLeads } from '@/application/lib/date-utils';
import { LeadService } from '@/application/services/lead.service';
import { KanbanBoard } from './kanban-board';
import { LeadsListView } from './leads-list-view';
import { BulkActionBar } from './bulk-action-bar';
import { LeadDrawer } from './lead-drawer';
import { CreateLeadModal } from './create-lead-modal';
import { Button } from '@/components/ui/button';
import { AgentLeaderboard } from '@/components/analytics/agent-leaderboard';
import { SmartTimingWidget } from '@/components/analytics/smart-timing-widget';
import { KPICard } from '@/components/ui/kpi-card';
import { AgencyPerformanceStats } from '@/components/analytics/AgencyPerformanceStats';
import { FieldDefinition, FilterGroup } from '@/domain/entities/filter';
import { FilterService } from '@/application/services/filter.service';
import { DynamicFilterBar } from '@/components/ui/dynamic-filter-bar';
import { DailyObjectivesWidget } from './daily-objectives-widget';
import { SalesScriptsWidget } from './sales-scripts-widget';
import { PhoningSessionModal } from '@/components/sales/phoning-session-modal';
import { getSalesMetricsAction } from '@/application/actions/metrics.actions';
import { getVoiceSettingsAction } from '@/application/actions/communication.actions';
import { Play } from 'lucide-react';

// --- Sub-Components (Styled for Dark Mode) ---

import { TransformationLeaderboard } from '../analytics/transformation-leaderboard';
import { SourcePerformanceComparator } from '../analytics/source-performance-comparator';
import { DuplicateAnalysisReport } from '../analytics/duplicate-analysis-report';

function SupervisionView({ leads, organisationId }: { leads: Lead[], organisationId: string }) {
    const totalLeads = leads.length;
    const answered = leads.filter(l => l.status === LeadStatus.CONTACTED || l.status === LeadStatus.QUALIFIED || l.status === LeadStatus.RDV_FIXE).length;
    const answerRate = totalLeads ? Math.round((answered / totalLeads) * 100) : 0;
    const pipelineValue = leads.filter(l => l.score > 50).length * 1500;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 overflow-y-auto h-full p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard title="Volume Entrant" value={totalLeads.toString()} trend="+12%" trendDirection="up" icon={Users} />
                <KPICard title="CA Potentiel" value={`${(pipelineValue / 1000).toFixed(1)}k€`} trend="+5%" trendDirection="up" icon={TrendingUp} />
                <KPICard title="Taux Réponse" value={`${answerRate}%`} trend="-2%" trendDirection="down" icon={Phone} />
                <KPICard title="Délai Moyen" value="4h 12m" trend="-15m" trendDirection="up" icon={Clock} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <SourcePerformanceComparator />
                    <DuplicateAnalysisReport />
                    <AgencyPerformanceStats organisationId={organisationId} />
                </div>
                <div className="space-y-6">
                    <TransformationLeaderboard orgId={organisationId} />
                    <AgentLeaderboard />
                </div>
            </div>
        </div>
    );
}

import { LeadSourcesManager } from './lead-sources-manager';

function ConfigView({ organisationId }: { organisationId: string }) {
    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <LeadSourcesManager orgId={organisationId} />
            </div>
        </div>
    );
}


const LEAD_FIELDS: FieldDefinition[] = [
    { id: 'firstName', label: 'Prénom', type: 'text' },
    { id: 'lastName', label: 'Nom', type: 'text' },
    { id: 'email', label: 'Email', type: 'text' },
    { id: 'phone', label: 'Téléphone', type: 'text' },
    { id: 'status', label: 'Statut', type: 'enum', options: Object.values(LeadStatus).map(s => ({ label: s, value: s })) },
    { id: 'source', label: 'Source', type: 'text' },
    { id: 'score', label: 'Score IA', type: 'number' },
    {
        id: 'pipeline', label: 'Pipeline', type: 'enum', options: [
            { label: 'Nouveau Lead', value: 'NOUVEAU' },
            { label: 'En cours', value: 'EN_COURS' },
            { label: 'Relances / NRP', value: 'RELANCES' },
            { label: 'RDV Validé', value: 'RDV_FIXE' }
        ]
    },
];

export default function ProspectionDashboard({ initialLeads }: { initialLeads?: Lead[] }) {
    const { user, activeOrganization, activeAgency, activeMembership } = useAuthStore();

    // UI State
    const [activeTab, setActiveTab] = useState('pilotage'); // 'pilotage' | 'supervision' | 'config'
    const [activeScope, setActiveScope] = useState('mine'); // 'mine' | 'all' | 'urgent' | 'archived'
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Data State
    const [leads, setLeads] = useState<LeadWithOrg[]>(initialLeads ? (hydrateLeads(initialLeads) as LeadWithOrg[]) : []);
    const [isLoading, setIsLoading] = useState(false);
    const [isUnifiedView, setIsUnifiedView] = useState(false);
    const [selectedLead, setSelectedLead] = useState<LeadWithOrg | null>(null);
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [salesReps, setSalesReps] = useState<{ id: string, name: string }[]>([]);

    // Filter Logic
    const [filterGroup, setFilterGroup] = useState<FilterGroup>({ id: 'root', conjunction: 'and', rules: [] });
    const [groupBy, setGroupBy] = useState<string>('pipeline');

    // Phoning Session State
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

    // Derive Session Candidates from loaded leads (Sync with Kanban)
    const sessionCandidates = useMemo(() => {
        return leads.filter(l =>
            l.status === 'PROSPECT' ||
            l.status === 'PROSPECTION' ||
            (l.nextCallbackAt && new Date(l.nextCallbackAt) <= new Date())
        ).filter(l => l.status !== 'ARCHIVED' && l.status !== 'DISQUALIFIED');
    }, [leads]);

    useEffect(() => {
        if (activeOrganization && user) {
            // Load Voice Settings
            getVoiceSettingsAction(activeOrganization.id).then(res => {
                if (res.success && res.data) setIsVoiceEnabled((res.data as any).voiceEnabled);
            });
        }
    }, [activeOrganization, user]);

    const handleStartSession = () => {
        if (!isVoiceEnabled) {
            alert("La téléphonie n'est pas activée. Veuillez contacter votre administrateur.");
            return;
        }
        if (sessionCandidates.length === 0) {
            alert("Aucun lead à rappeler pour le moment.");
            return;
        }
        setIsSessionActive(true);
    };

    useEffect(() => {
        if (activeOrganization) {
            loadLeads();
            getSalesRepsAction(activeOrganization.id).then(res => {
                if (res.success && res.users) setSalesReps(res.users);
            });
        }
    }, [activeOrganization, isUnifiedView, activeAgency?.id, activeScope]);

    const loadLeads = async (scopeOverride?: string) => {
        if (!activeOrganization) return;
        setIsLoading(true);
        const currentScope = scopeOverride || activeScope;

        // Fetch logic
        let showAll = currentScope === 'all';
        // Note: isUnifiedView might be redundant if scope='all' covers it, but kept for legacy support

        const res = await getLeadsAction(activeOrganization.id, isUnifiedView || showAll || groupBy === 'pipeline', activeAgency?.id);
        if (res.success && res.leads) {
            setLeads(hydrateLeads(res.leads));
        }
        setIsLoading(false);
    };

    // [RBAC] Access Control
    const canViewAll = activeMembership && (
        [Role.SUPER_ADMIN, Role.ADMIN_OF, Role.MANAGER_AGENCY].includes(activeMembership.role as Role) ||
        ['administrateur', 'admin', 'manager'].includes((activeMembership.role as string).toLowerCase())
    );

    const filteredLeads = useMemo(() => {
        const enriched = leads.map(l => ({ ...l, smartQueue: LeadService.getSmartQueueType(l) }));
        let result = FilterService.filterArray(enriched, filterGroup);

        // Scope Filtering
        if (activeTab === 'pilotage') {
            switch (activeScope) {
                case 'mine':
                    // Default view: Active leads. In reality, filter by assignee == currentUser.id if available
                    // For now, we assume "Mine" means "Active & Not Disqualified" for the agent user context (or simplified)
                    result = result.filter(l => ![LeadStatus.ARCHIVED, LeadStatus.DISQUALIFIED].includes(l.status as any));
                    break;
                case 'urgent':
                    result = result.filter(l => l.score > 70 && ![LeadStatus.ARCHIVED, LeadStatus.DISQUALIFIED].includes(l.status as any));
                    break;
                case 'all':
                    // Manager view: All active leads
                    result = result.filter(l => ![LeadStatus.ARCHIVED, LeadStatus.DISQUALIFIED].includes(l.status as any));
                    break;
                case 'archived':
                    result = result.filter(l => [LeadStatus.ARCHIVED, LeadStatus.DISQUALIFIED].includes(l.status as any));
                    break;
            }
        }
        return result;
    }, [leads, filterGroup, activeTab, activeScope]);

    const handleScopeChange = (newScope: string) => {
        setActiveScope(newScope);
        loadLeads(newScope);
    };

    const handleLeadUpdate = (updated: Lead) => {
        setLeads(prev => prev.map(l => l.id === updated.id ? { ...updated, organizationName: l.organizationName } as LeadWithOrg : l));
        setSelectedLead(updated as LeadWithOrg);
    };

    const handleBulkComplete = () => {
        loadLeads();
        setSelectedLeadIds([]);
    };

    // Tabs Definition
    const navTabs = [
        { id: 'pilotage', label: 'Pilotage', icon: Headphones },
        { id: 'supervision', label: 'Supervision', icon: LayoutDashboard, requiredRole: true },
        { id: 'config', label: 'Config', icon: Settings, requiredRole: true },
    ].filter(t => !t.requiredRole || canViewAll);

    // Scopes Definition
    const scopes = [
        { id: 'mine', label: 'Mon Cockpit', icon: Headphones },
        { id: 'urgent', label: 'À Relancer', icon: Activity, badge: leads.filter(l => l.score > 70).length },
        { id: 'all', label: 'Tous les Leads', icon: Users, requiredRole: true },
        { id: 'archived', label: 'Archives', icon: Archive, requiredRole: true },
    ].filter(s => !s.requiredRole || canViewAll);

    // Ensure fallback
    useEffect(() => {
        if (!navTabs.find(t => t.id === activeTab)) {
            setActiveTab('pilotage');
        }
    }, [activeTab, canViewAll]);

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans selection:bg-indigo-500/30">

            {/* 1. Slim Header with Horizontal Nav */}
            <header className="h-14 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md flex items-center justify-between px-4 z-20">
                <div className="flex items-center gap-4">


                    {/* Horizontal Tabs */}
                    <nav className="flex items-center gap-1 p-1">
                        {navTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                                    ${activeTab === tab.id
                                        ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}
                                `}
                            >
                                <tab.icon size={14} className={activeTab === tab.id ? 'text-indigo-400' : ''} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    <div className="h-4 w-px bg-slate-800 mx-1" />

                    {/* Scope Selector (Only in Pilotage) */}
                    {activeTab === 'pilotage' && (
                        <nav className="flex items-center gap-1 bg-slate-900/50 p-0.5 rounded-lg border border-slate-800/50 animate-in fade-in slide-in-from-left-2">
                            {scopes.map(scope => (
                                <button
                                    key={scope.id}
                                    onClick={() => handleScopeChange(scope.id)}
                                    className={`
                                        flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors
                                        ${activeScope === scope.id
                                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                            : 'text-slate-500 hover:text-slate-300'}
                                    `}
                                >
                                    {scope.label}
                                    {scope.badge !== undefined && scope.badge > 0 && (
                                        <span className={`text-[9px] px-1 rounded-full ml-1 ${activeScope === scope.id ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'}`}>
                                            {scope.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    {activeTab === 'pilotage' && (
                        <div className="flex bg-slate-900 p-0.5 rounded-md border border-slate-800">
                            <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded text-xs gap-2 flex items-center ${viewMode === 'kanban' ? 'bg-slate-800 text-indigo-400 shadow-sm' : 'text-slate-500'}`} title="Vue Kanban"><LayoutGrid size={14} /></button>
                            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded text-xs gap-2 flex items-center ${viewMode === 'list' ? 'bg-slate-800 text-indigo-400 shadow-sm' : 'text-slate-500'}`} title="Vue Liste"><ListIcon size={14} /></button>
                        </div>
                    )}

                    <div className="h-4 w-px bg-slate-800 mx-1" />

                    <div className="relative hidden md:block group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={14} />
                        <input type="text" placeholder="Recherche rapide (CMD+K)" className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md pl-8 pr-4 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-900 w-56 transition-all" />
                    </div>

                    <Button size="sm" onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3">
                        <Plus size={14} className="mr-1.5" /> Nouveau
                    </Button>
                </div>
            </header>

            {/* 2. Main Content Area */}
            <main className="flex-1 overflow-hidden relative bg-slate-950">
                {/* Grid Background */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.15)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                <div className="relative z-10 h-full flex flex-col">
                    {activeTab === 'pilotage' ? (
                        <div className="h-full flex gap-4 p-4 animate-in fade-in zoom-in-95 duration-200">

                            {/* Main Workspace */}
                            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                                {/* Toolbar */}
                                <div className="flex justify-between items-center bg-slate-950/80 backdrop-blur-sm p-2 rounded-xl border border-slate-800/50 shadow-sm shrink-0">
                                    <DynamicFilterBar
                                        moduleId="prospection"
                                        fields={LEAD_FIELDS}
                                        onFilterChange={setFilterGroup}
                                        currentGroupBy={groupBy}
                                        onGroupByChange={setGroupBy}
                                    />
                                    {selectedLeadIds.length > 0 && <span className="text-xs text-indigo-400 font-medium px-3">{selectedLeadIds.length} leads sélectionnés</span>}
                                </div>

                                {/* View Content */}
                                <div className="flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm shadow-inner relative">
                                    {isLoading ? (
                                        <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-3">
                                            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-xs animate-pulse">Chargement des données...</span>
                                        </div>
                                    ) : (
                                        <>
                                            {viewMode === 'kanban' ? (
                                                <KanbanBoard
                                                    leads={filteredLeads}
                                                    allLeads={leads}
                                                    onLeadClick={(lead) => setSelectedLead(lead as LeadWithOrg)}
                                                    groupBy={groupBy}
                                                    selectedIds={selectedLeadIds}
                                                    onToggleSelect={(id: string, multi?: boolean) => setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : (multi ? [...prev, id] : [id]))}
                                                />
                                            ) : (
                                                <LeadsListView
                                                    leads={filteredLeads}
                                                    onLeadClick={(lead) => setSelectedLead(lead as LeadWithOrg)}
                                                    selectedIds={selectedLeadIds}
                                                    onToggleSelect={(id: string, multi?: boolean) => setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                                                    onSelectAll={(ids) => setSelectedLeadIds(ids)}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Right Panel - Gamification & Tools */}
                            <div className="w-72 shrink-0 flex flex-col gap-4 animate-in slide-in-from-right-4 duration-500 overflow-hidden">
                                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-900 border border-indigo-500/30 shadow-lg text-white">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg">Call Session</h3>
                                            <p className="text-indigo-200 text-xs">{sessionCandidates.length} leads à traiter</p>
                                        </div>
                                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                            <Phone className="text-white" size={20} />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleStartSession}
                                        className="w-full bg-white text-indigo-700 hover:bg-indigo-50 font-bold border-none"
                                    >
                                        <Play size={16} className="mr-2" />
                                        Lancer la session
                                    </Button>
                                </div>

                                {user && <DailyObjectivesWidget userId={user.id} />}
                                <SalesScriptsWidget selectedLead={selectedLead} />
                            </div>

                            {/* Bulk Actions Float */}
                            {selectedLeadIds.length > 0 && (
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
                                    <BulkActionBar
                                        selectedIds={selectedLeadIds}
                                        onClear={() => setSelectedLeadIds([])}
                                        onActionComplete={handleBulkComplete}
                                        bulkUpdateAction={bulkUpdateLeadsAction}
                                        salesReps={salesReps}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                            {activeTab === 'supervision' && <SupervisionView leads={leads} organisationId={activeOrganization?.id || ''} />}
                            {activeTab === 'config' && <ConfigView organisationId={activeOrganization?.id || ''} />}
                        </div>
                    )}
                </div>
            </main>

            {/* Drawers & Modals */}
            <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={handleLeadUpdate} />
            {showCreateModal && activeOrganization && (
                <CreateLeadModal
                    organizationId={activeOrganization.id}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={(newLead) => { handleLeadUpdate(newLead); setShowCreateModal(false); }}
                />
            )}

            {/* Phoning Session Modal */}
            {isSessionActive && (
                <PhoningSessionModal
                    leads={sessionCandidates}
                    onClose={() => setIsSessionActive(false)}
                />
            )}
        </div>
    );
}
