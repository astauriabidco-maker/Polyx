import {
    LayoutGrid, ChartBar, Users, BookOpen, GraduationCap,
    Fingerprint, Briefcase, Folder, ShieldCheck, Settings2,
    Network, DollarSign, Zap, FileText, MapPin, ClipboardCheck,
    Terminal, Radar, FileSpreadsheet, BrainCircuit, Globe, Calendar, Target
} from 'lucide-react';

export interface SubMenuItem {
    id: string;
    name: string;
    hrefPath?: string; // If different from the parent but relative
}

export interface ModuleItem {
    id: string;
    name: string;
    href: string;
    icon: any;
    description?: string;
    subItems?: SubMenuItem[];
}

export interface ModuleCategory {
    name: string;
    color: string;
    modules: ModuleItem[];
}

export const APP_MODULES: ModuleCategory[] = [
    {
        name: "Pilotage & Ventes",
        color: "text-indigo-500",
        modules: [
            { id: 'DASHBOARD_VIEW', name: 'Tableau de Bord', href: '/app/dashboard', icon: ChartBar },
            { id: 'ASSESSMENT_DASHBOARD', name: 'Pilotage Tests', href: '/app/dashboard/assessments', icon: GraduationCap },
            { id: 'AGENDA_VIEW', name: 'Agenda Intelligent', href: '/app/agenda', icon: Calendar },
            {
                id: 'LEADS_VIEW', name: 'Leads & Marketing', href: '/app/leads', icon: Users, subItems: [
                    { id: 'LEADS_ORCHESTRATION', name: 'Orchestration Campagnes' },
                    { id: 'LEADS_SEGMENTS', name: 'Audiences & Segments' },
                    { id: 'LEADS_IMPORT', name: 'Import & Qualification' }
                ]
            },
            { id: 'CRM_VIEW', name: 'CRM & Closing', href: '/app/crm', icon: Briefcase },
        ]
    },
    {
        name: "Suivi Formation",
        color: "text-blue-500",
        modules: [
            { id: 'LEARNERS_VIEW', name: 'Mes Apprenants', href: '/app/learners', icon: GraduationCap },
            { id: 'ATTENDANCE_VIEW', name: 'Suivi Émargement', href: '/app/attendance', icon: Fingerprint },
            { id: 'EXAMS_VIEW', name: 'Sessions d\'Examens', href: '/app/network?tab=exams', icon: ClipboardCheck },
            { id: 'TRAINERS_VIEW', name: 'Gestion Formateurs', href: '/app/formateur', icon: Users },
            { id: 'ACADEMY_VIEW', name: 'Pédagogie / Catalogue', href: '/app/academy/catalog', icon: BookOpen },
            { id: 'ASSESSMENT_STUDIO', name: 'Studio Builder', href: '/app/dashboard/studio/builder', icon: FileSpreadsheet },
            { id: 'QUALITY_VIEW', name: 'Qualité / Audit', href: '/app/quality', icon: ShieldCheck },
            { id: 'WATCH_VIEW', name: 'Veille & Écosystème', href: '/app/veille', icon: Radar },
        ]
    },
    {
        name: "Exploitation & Finance",
        color: "text-emerald-600",
        modules: [
            { id: 'NETWORK_VIEW', name: 'Pilotage Réseau', href: '/app/network', icon: Network },
            { id: 'BILLING_VIEW', name: 'Facturation Client', href: '/app/billing/invoices', icon: FileText },
            { id: 'BPF_VIEW', name: 'Bilan Pédagogique (BPF)', href: '/app/bpf', icon: FileSpreadsheet },
            { id: 'STRATEGIC_VIEW', name: 'Cockpit Stratégique', href: '/app/reporting', icon: BrainCircuit },
        ]
    },
    {
        name: "Paramètres & Système",
        color: "text-slate-500",
        modules: [
            {
                id: 'ADMIN_VIEW', name: 'Administration', href: '/app/admin', icon: Settings2, subItems: [
                    { id: 'ROLES_MANAGE', name: 'Gestion des Rôles' },
                    { id: 'USERS_MANAGE', name: 'Gestion des Équipes' },
                    { id: 'STRUCTURE_MANAGE', name: 'Structure & Agences' }
                ]
            },
            { id: 'INTEGRATIONS_VIEW', name: 'Intégrations & API', href: '/app/settings/integrations', icon: Globe },
            { id: 'AUDIT_VIEW', name: 'Audit & Sécurité', href: '/app/audit', icon: ShieldCheck },
            {
                id: 'NEXUS_VIEW', name: 'Nexus Admin', href: '/app/admin/nexus', icon: Zap, subItems: [
                    { id: 'PLATFORM_SETTINGS', name: 'Identité Plateforme', hrefPath: '/app/admin/nexus/settings' }
                ]
            },
        ]
    }
];

export const getAllPermissionIds = (): string[] => {
    const ids: string[] = [];
    APP_MODULES.forEach(cat => {
        cat.modules.forEach(mod => {
            ids.push(mod.id);
            if (mod.subItems) {
                mod.subItems.forEach(sub => ids.push(sub.id));
            }
        });
    });
    return ids;
};
