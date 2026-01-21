'use client';

import { useState, useEffect } from 'react';
import { Zap, Clock, CheckCircle2, XCircle, Send, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    getLeadEnrollmentsAction,
    enrollLeadAction,
    cancelEnrollmentAction,
    getNurturingSequencesAction
} from '@/application/actions/nurturing.actions';
import { NurturingEnrollmentStatus, NurturingTaskStatus } from '@/domain/entities/nurturing';
import { Lead } from '@/domain/entities/lead';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NurturingStatusProps {
    lead: Lead;
    onUpdate?: () => void;
}

export function NurturingStatus({ lead, onUpdate }: NurturingStatusProps) {
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [availableSequences, setAvailableSequences] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [lead.id]);

    const loadData = async () => {
        setIsLoading(true);
        const [enrRes, seqRes] = await Promise.all([
            getLeadEnrollmentsAction(lead.id),
            getNurturingSequencesAction(lead.organizationId)
        ]);

        if (enrRes.success) setEnrollments(enrRes.enrollments || []);
        if (seqRes.success) setAvailableSequences(seqRes.sequences || []);
        setIsLoading(false);
    };

    const handleEnroll = async (sequenceId: string) => {
        setIsActionLoading(true);
        const res = await enrollLeadAction(lead.id, sequenceId, lead.organizationId);
        if (res.success) {
            await loadData();
            if (onUpdate) onUpdate();
        } else {
            alert("Erreur lors de l'inscription : " + res.error);
        }
        setIsActionLoading(false);
    };

    const handleCancel = async (sequenceId?: string) => {
        setIsActionLoading(true);
        const res = await cancelEnrollmentAction(lead.id, sequenceId);
        if (res.success) {
            await loadData();
            if (onUpdate) onUpdate();
        }
        setIsActionLoading(false);
    };

    const activeEnrollment = enrollments.find(e => e.status === NurturingEnrollmentStatus.ACTIVE);

    if (isLoading) {
        return <div className="p-4 text-center text-xs text-slate-400">Chargement du nurturing...</div>;
    }

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Zap size={16} className="text-indigo-600" />
                Marketing Automation
            </h4>

            {activeEnrollment ? (
                <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">En cours d'automatisation</p>
                            <p className="text-sm font-bold text-slate-900">{activeEnrollment.sequence.name}</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(activeEnrollment.sequenceId)}
                            className="h-7 text-[10px] text-red-600 hover:bg-red-50"
                            disabled={isActionLoading}
                        >
                            Arrêter
                        </Button>
                    </div>

                    <div className="space-y-2 mt-2">
                        {activeEnrollment.tasks?.map((task: any, idx: number) => (
                            <div key={task.id} className="flex items-center gap-3 text-xs">
                                <div className="flex flex-col items-center">
                                    {task.status === NurturingTaskStatus.EXECUTED ? (
                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                    ) : task.status === NurturingTaskStatus.CANCELLED ? (
                                        <XCircle size={14} className="text-slate-300" />
                                    ) : (
                                        <Clock size={14} className="text-indigo-400 animate-pulse" />
                                    )}
                                    {idx < activeEnrollment.tasks.length - 1 && <div className="w-px h-3 bg-slate-200 mt-1" />}
                                </div>
                                <div className={`flex-1 ${task.status === NurturingTaskStatus.PENDING ? 'text-slate-700' : 'text-slate-400'}`}>
                                    <div className="flex justify-between">
                                        <span className="font-medium">{task.type} via {task.channel}</span>
                                        <span>{format(new Date(task.scheduledAt), 'HH:mm', { locale: fr })}</span>
                                    </div>
                                    <div className="text-[10px] opacity-70">
                                        {task.status === NurturingTaskStatus.EXECUTED
                                            ? `Envoyé le ${format(new Date(task.executedAt), 'dd/MM HH:mm', { locale: fr })}`
                                            : `Prévu le ${format(new Date(task.scheduledAt), 'dd MMM', { locale: fr })}`
                                        }
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="p-4 rounded-xl border border-slate-200 border-dashed space-y-3 text-center">
                    <p className="text-xs text-slate-500">Aucun programme de relance actif pour ce lead.</p>

                    {availableSequences.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {availableSequences.map(seq => (
                                <Button
                                    key={seq.id}
                                    onClick={() => handleEnroll(seq.id)}
                                    className="w-full text-xs h-8 bg-slate-900 hover:bg-slate-800 text-white gap-2"
                                    disabled={isActionLoading}
                                >
                                    <Play size={12} /> Lancer "{seq.name}"
                                </Button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[10px] text-slate-400">Configurez des séquences dans les réglages Marketing pour automatiser vos relances.</p>
                    )}
                </div>
            )}

            {/* History of past enrollments if any */}
            {enrollments.some(e => e.status !== NurturingEnrollmentStatus.ACTIVE) && (
                <div className="mt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Historique Automation</p>
                    <div className="space-y-1">
                        {enrollments.filter(e => e.status !== NurturingEnrollmentStatus.ACTIVE).map(e => (
                            <div key={e.id} className="text-[11px] text-slate-500 flex items-center justify-between">
                                <span>{e.sequence.name}</span>
                                <span className={e.status === NurturingEnrollmentStatus.COMPLETED ? 'text-emerald-600' : 'text-slate-400'}>
                                    {e.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
