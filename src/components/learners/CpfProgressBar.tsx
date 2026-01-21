'use client';

import { cn } from "@/lib/utils";

// CDC CPF Workflow Statuses
export const CPF_STATUSES = [
    { key: 'A_TRAITER', label: 'A traiter', shortLabel: 'Reçu', color: 'slate' },
    { key: 'EN_ATTENTE', label: 'En attente', shortLabel: 'Attente', color: 'amber' },
    { key: 'ACCEPTE', label: 'Accepté', shortLabel: 'Accepté', color: 'emerald' },
    { key: 'ENTREE_DECLAREE', label: 'Entrée déclarée', shortLabel: 'Entrée', color: 'blue' },
    { key: 'SORTIE_DECLAREE', label: 'Sortie déclarée', shortLabel: 'Sortie', color: 'indigo' },
    { key: 'SERVICE_FAIT_DECLARE', label: 'Service fait déclaré', shortLabel: 'SF Déclaré', color: 'purple' },
    { key: 'SERVICE_FAIT_VALIDE', label: 'Service fait validé', shortLabel: 'SF Validé', color: 'violet' },
    { key: 'FACTURE', label: 'Facturé', shortLabel: 'Facturé', color: 'green' }
] as const;

export type CpfStatusKey = typeof CPF_STATUSES[number]['key'];

interface CpfProgressBarProps {
    currentStatus: CpfStatusKey | string | null | undefined;
    milestones?: {
        receivedDate?: Date | string | null;
        acceptanceDate?: Date | string | null;
        entryDeclaredDate?: Date | string | null;
        exitDeclaredDate?: Date | string | null;
        serviceDeclaredDate?: Date | string | null;
        serviceValidatedDate?: Date | string | null;
        invoicedDate?: Date | string | null;
    };
    className?: string;
}

export function CpfProgressBar({ currentStatus, milestones = {}, className }: CpfProgressBarProps) {
    console.log('CpfProgressBar DEBUG:', { currentStatus, milestones });

    // Map currentStatus to a valid key if it's one of the legacy labels
    const statusKeyMap: Record<string, CpfStatusKey> = {
        'Accepté': 'ACCEPTE',
        'En attente': 'EN_ATTENTE',
        'A traiter': 'A_TRAITER',
        'Accepté (CDC)': 'ACCEPTE',
    };

    const normalizedStatus = statusKeyMap[currentStatus as string] || currentStatus;
    const currentIndex = CPF_STATUSES.findIndex(s => s.key === normalizedStatus);
    const activeIndex = currentIndex >= 0 ? currentIndex : 0;
    const activeStatus = CPF_STATUSES[activeIndex];

    const formatDate = (date: Date | string | null | undefined) => {
        if (!date) return null;
        return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Map milestones to status keys
    const milestoneDates: Record<string, string | null> = {
        'A_TRAITER': formatDate(milestones.receivedDate),
        'EN_ATTENTE': null,
        'ACCEPTE': formatDate(milestones.acceptanceDate),
        'ENTREE_DECLAREE': formatDate(milestones.entryDeclaredDate),
        'SORTIE_DECLAREE': formatDate(milestones.exitDeclaredDate),
        'SERVICE_FAIT_DECLARE': formatDate(milestones.serviceDeclaredDate),
        'SERVICE_FAIT_VALIDE': formatDate(milestones.serviceValidatedDate),
        'FACTURE': formatDate(milestones.invoicedDate),
    };

    // Color classes for active status badge
    const colorClasses: Record<string, string> = {
        slate: 'bg-slate-500',
        amber: 'bg-amber-500',
        emerald: 'bg-emerald-500',
        blue: 'bg-blue-500',
        indigo: 'bg-indigo-500',
        purple: 'bg-purple-500',
        violet: 'bg-violet-500',
        green: 'bg-green-600',
    };

    // Color hex values for dynamic styling (since Tailwind classes might not be available as strings)
    const colorHex: Record<string, string> = {
        slate: '#64748b',
        amber: '#f59e0b',
        emerald: '#10b981',
        blue: '#3b82f6',
        indigo: '#6366f1',
        purple: '#a855f7',
        violet: '#8b5cf6',
        green: '#16a34a',
    };

    return (
        <div className={cn("w-full", className)}>
            {/* Current Status Badge - Prominent display */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "px-4 py-2 rounded-full text-white font-bold text-sm flex items-center gap-2 shadow-lg transition-colors duration-500",
                        colorClasses[activeStatus.color]
                    )}>
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        {activeStatus.label}
                    </div>
                    <span className="text-sm text-slate-500">Étape {activeIndex + 1} / {CPF_STATUSES.length}</span>
                </div>
                {milestoneDates[activeStatus.key] && (
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-slate-500 uppercase">Dernière mise à jour</span>
                        <span className="text-sm font-bold text-indigo-600">{milestoneDates[activeStatus.key]}</span>
                    </div>
                )}
            </div>

            {/* Progress Line */}
            <div className="relative flex items-center justify-between px-2">
                {/* Background Line */}
                <div className="absolute top-4 left-0 right-0 h-1.5 bg-slate-200 rounded-full mx-2" />

                {/* Active Line - Color matches status */}
                <div
                    className={cn(
                        "absolute top-4 left-0 h-1.5 rounded-full transition-all duration-700 mx-2",
                        colorClasses[activeStatus.color]
                    )}
                    style={{ width: `calc(${(activeIndex / (CPF_STATUSES.length - 1)) * 100}% - 2px)` }}
                />

                {/* Status Points */}
                {CPF_STATUSES.map((status, index) => {
                    const isPast = index < activeIndex;
                    const isCurrent = index === activeIndex;
                    const isFuture = index > activeIndex;
                    const date = milestoneDates[status.key];

                    return (
                        <div key={status.key} className="relative flex flex-col items-center z-10" style={{ width: '0' }}>
                            {/* Dot */}
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300",
                                    isPast && cn(colorClasses[status.color], "border-transparent text-white"),
                                    isCurrent && "bg-white border-4 scale-125 shadow-lg",
                                    isFuture && "bg-slate-50 border-slate-200 text-slate-300"
                                )}
                                style={isCurrent ? { borderColor: colorHex[status.color] } : {}}
                            >
                                {isPast ? '✓' : index + 1}
                            </div>

                            {/* Label */}
                            <div className={cn(
                                "absolute top-12 w-20 text-center transition-all duration-300",
                                isCurrent && "scale-105"
                            )}>
                                <p className={cn(
                                    "text-[10px] leading-tight transition-colors",
                                    isCurrent ? "font-bold text-slate-800" : isPast ? "font-medium text-slate-600" : "text-slate-400"
                                )}>
                                    {status.shortLabel}
                                </p>
                                {date && (
                                    <p className={cn(
                                        "text-[9px] font-bold mt-1 px-1 py-0.5 rounded-md inline-block",
                                        isCurrent ? "bg-indigo-50 text-indigo-600" : "text-slate-400"
                                    )}>
                                        {date}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Spacer for labels */}
            <div className="h-12" />
        </div>
    );
}

export default CpfProgressBar;
