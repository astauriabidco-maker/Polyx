'use client';

import { useState } from 'react';
import { X, Phone, PhoneOff, PhoneMissed, Voicemail, AlertTriangle, Clock, Calendar, PhoneForwarded, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { logCallAction, type CallOutcome } from '@/application/actions/activity.actions';
import { RefusalReason } from '@/domain/entities/lead';

interface CallLogModalProps {
    leadId: string;
    leadName: string;
    onClose: () => void;
    onSuccess: () => void;
    defaultOutcome?: CallOutcome;
    defaultNotes?: string;
}

const OUTCOMES: { value: CallOutcome; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'ANSWERED', label: 'Répondu', icon: <Phone size={18} />, color: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'APPOINTMENT_SET', label: 'RDV Fixé', icon: <Calendar size={18} />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: 'CALLBACK_SCHEDULED', label: 'Rappel nécessaire', icon: <PhoneForwarded size={18} />, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { value: 'NO_ANSWER', label: 'Pas de réponse', icon: <PhoneMissed size={18} />, color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'BUSY', label: 'Occupé', icon: <PhoneOff size={18} />, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: 'VOICEMAIL', label: 'Messagerie', icon: <Voicemail size={18} />, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'REFUSAL', label: 'Refus / Pas intéressé', icon: <UserX size={18} />, color: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'WRONG_NUMBER', label: 'Faux numéro', icon: <AlertTriangle size={18} />, color: 'bg-red-100 text-red-700 border-red-200' },
];

export default function CallLogModal({ leadId, leadName, onClose, onSuccess, defaultOutcome, defaultNotes }: CallLogModalProps) {
    const [outcome, setOutcome] = useState<CallOutcome | null>(defaultOutcome || null);
    const [duration, setDuration] = useState('');
    const [notes, setNotes] = useState(defaultNotes || '');
    const [scheduleCallback, setScheduleCallback] = useState(false);
    const [callbackDate, setCallbackDate] = useState('');
    const [callbackTime, setCallbackTime] = useState('');
    const [selectedRefusalReason, setSelectedRefusalReason] = useState<RefusalReason | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit() {
        if (!outcome) return;

        setIsSubmitting(true);

        // Parse duration (mm:ss format)
        let durationSeconds: number | undefined;
        if (duration) {
            const parts = duration.split(':');
            if (parts.length === 2) {
                durationSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            } else {
                durationSeconds = parseInt(duration) * 60; // Assume minutes only
            }
        }

        // Parse callback datetime
        let callbackAt: Date | undefined;
        if (scheduleCallback && callbackDate && callbackTime) {
            callbackAt = new Date(`${callbackDate}T${callbackTime}`);
        }

        const result = await logCallAction(leadId, outcome, durationSeconds, notes || undefined, callbackAt, selectedRefusalReason || undefined);

        setIsSubmitting(false);

        if (result.success) {
            onSuccess();
            onClose();
        } else {
            alert(result.error || 'Erreur lors de l\'enregistrement');
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div>
                        <h3 className="font-bold text-slate-900">Enregistrer l'appel</h3>
                        <p className="text-sm text-slate-500">{leadName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-5">
                    {/* Outcome Selection */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                            Résultat de l'appel
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {OUTCOMES.map((o) => (
                                <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => setOutcome(o.value)}
                                    className={`
                                        flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all
                                        ${outcome === o.value
                                            ? o.color + ' border-current ring-2 ring-offset-1'
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    {o.icon}
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                            Durée (optionnel)
                        </label>
                        <Input
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            placeholder="ex: 5:30 (5 min 30 sec)"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                            Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Résumé de l'échange..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            rows={3}
                        />
                    </div>

                    {/* Refusal Reason (Dynamic) */}
                    {outcome === 'REFUSAL' && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-100 space-y-2">
                            <label className="text-xs font-bold text-red-700 uppercase tracking-wider block">
                                Motif du refus (Obligatoire)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: RefusalReason.PRICE, label: 'Prix' },
                                    { id: RefusalReason.COMPETITION, label: 'Concurrence' },
                                    { id: RefusalReason.NO_PROJECT, label: 'Pas de projet' },
                                    { id: RefusalReason.OTHER, label: 'Autre' }
                                ].map(r => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => setSelectedRefusalReason(r.id)}
                                        className={`px-3 py-2 rounded-md text-xs font-medium border transition-all ${selectedRefusalReason === r.id ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'}`}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Schedule Callback */}
                    <div className={`p-3 rounded-lg border ${outcome === 'CALLBACK_SCHEDULED' ? 'bg-indigo-50 border-indigo-200 animate-pulse' : 'bg-slate-50 border-slate-200'}`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={scheduleCallback || outcome === 'CALLBACK_SCHEDULED'}
                                onChange={(e) => setScheduleCallback(e.target.checked)}
                                className="rounded border-slate-300"
                                disabled={outcome === 'CALLBACK_SCHEDULED'}
                            />
                            <Clock size={16} className="text-slate-500" />
                            <span className="text-sm font-medium text-slate-700">Planifier un rappel {outcome === 'CALLBACK_SCHEDULED' && '(Obligatoire)'}</span>
                        </label>

                        {(scheduleCallback || outcome === 'CALLBACK_SCHEDULED') && (
                            <div className="grid grid-cols-2 gap-2 mt-3">
                                <Input
                                    type="date"
                                    value={callbackDate}
                                    onChange={(e) => setCallbackDate(e.target.value)}
                                    className={outcome === 'CALLBACK_SCHEDULED' && !callbackDate ? 'border-red-400' : ''}
                                />
                                <Input
                                    type="time"
                                    value={callbackTime}
                                    onChange={(e) => setCallbackTime(e.target.value)}
                                    className={outcome === 'CALLBACK_SCHEDULED' && !callbackTime ? 'border-red-400' : ''}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={
                            !outcome ||
                            isSubmitting ||
                            (outcome === 'REFUSAL' && !selectedRefusalReason) ||
                            (outcome === 'CALLBACK_SCHEDULED' && (!callbackDate || !callbackTime))
                        }
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                        {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
