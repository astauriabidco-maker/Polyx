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
        name: "Qualification",
        color: "text-slate-400",
        modules: [
            { id: 'DASHBOARD_VIEW', name: 'Tableau de Bord', href: '/app/dashboard', icon: ChartBar },
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
            { id: 'QUALITY_VIEW', name: 'Qualité / Audit', href: '/app/quality', icon: ShieldCheck },
            { id: 'WATCH_VIEW', name: 'Veille & Écosystème', href: '/app/veille', icon: Radar },
        ]
    },
    {
        name: "Exploitation Réseau",
        color: "text-purple-500",
        modules: [
            { id: 'NETWORK_VIEW', name: 'Pilotage Réseau', href: '/app/network', icon: Network },
            {
                id: 'ADMIN_VIEW', name: 'Administration', href: '/app/admin', icon: ShieldCheck, subItems: [
                    { id: 'ROLES_MANAGE', name: 'Gestion des Rôles' },
                    { id: 'USERS_MANAGE', name: 'Gestion des Équipes' },
                    { id: 'STRUCTURE_MANAGE', name: 'Structure & Agences' }
                ]
            },
            { id: 'INTEGRATIONS_VIEW', name: 'Intégrations & API', href: '/app/settings/integrations', icon: Globe },
            { id: 'BILLING_VIEW', name: 'Facturation Client', href: '/app/billing/invoices', icon: FileText },
            { id: 'AUDIT_VIEW', name: 'Audit & Contrôle', href: '/app/audit', icon: ShieldCheck },
            { id: 'BPF_VIEW', name: 'Bilan Pédagogique (BPF)', href: '/app/bpf', icon: FileSpreadsheet },
            { id: 'STRATEGIC_VIEW', name: 'Cockpit Stratégique', href: '/app/reporting', icon: BrainCircuit },
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
