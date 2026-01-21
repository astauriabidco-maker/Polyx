'use client';

import { useState } from 'react';
import { Lead } from '@/domain/entities/lead';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { qualifyRdvAction, handleQualificationDecisionAction } from '@/application/actions/crm.actions';
import { Textarea } from '@/components/ui/textarea';

interface QualificationStepProps {
    lead: Lead;
    onUpdate: (lead: Lead) => void;
}

export function QualificationStep({ lead, onUpdate }: QualificationStepProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [absenceReason, setAbsenceReason] = useState('');
    const [showAbsenceForm, setShowAbsenceForm] = useState(false);
    const [showDecisionButtons, setShowDecisionButtons] = useState(false);

    const isScheduled = lead.nextCallbackAt && new Date(lead.nextCallbackAt) > new Date();

    const handleQualify = async (honored: boolean) => {
        if (!honored && !absenceReason) {
            setShowAbsenceForm(true);
            return;
        }

        setIsLoading(true);
        const res = await qualifyRdvAction(lead.id, honored, honored ? undefined : { absenceReason });
        setIsLoading(false);

        if (res.success && res.lead) {
            if (honored) {
                setShowDecisionButtons(true);
                // We don't necessarily update parent yet if we want to show the decision buttons in same view
                // But strictly, state likely changed to RDV_HONORE (if we implemented that intermediate state)
                // Or we just keep local state if DB didn't change stage significantly.
                // Let's assume onUpdate might refresh data.
                onUpdate(res.lead);
            } else {
                onUpdate(res.lead);
            }
        }
    };

    const handleDecision = async (decision: 'POURSUIVRE' | 'REPORTER' | 'ABANDON') => {
        setIsLoading(true);
        const res = await handleQualificationDecisionAction(lead.id, decision);
        setIsLoading(false);

        if (res.success && res.lead) {
            onUpdate(res.lead);
        }
    };

    // View: Absence Form
    if (showAbsenceForm) {
        return (
            <div className="max-w-md mx-auto space-y-4 text-center">
                <h3 className="text-xl font-bold text-slate-800">Motif de l'absence</h3>
                <p className="text-sm text-slate-500">Veuillez indiquer pourquoi le prospect ne s'est pas présenté.</p>
                <Textarea
                    placeholder="Ex: A oublié, Urgence médicale, Ne répond pas..."
                    value={absenceReason}
                    onChange={(e) => setAbsenceReason(e.target.value)}
                    className="min-h-[100px]"
                />
                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShowAbsenceForm(false)}>Annuler</Button>
                    <Button
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleQualify(false)}
                        disabled={!absenceReason || isLoading}
                    >
                        Enregistrer Absence
                    </Button>
                </div>
            </div>
        );
    }

    // View: Decision Buttons (Suite souhaitée)
    if (showDecisionButtons || lead.closingData?.appointmentHonored) {
        return (
            <div className="max-w-2xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">RDV Honoré - Suite souhaitée ?</h3>

                <div className="grid grid-cols-3 gap-4">
                    <div
                        onClick={() => handleDecision('POURSUIVRE')}
                        className="group p-6 border-2 border-green-100 bg-green-50/50 hover:bg-green-100/50 hover:border-green-500 rounded-xl cursor-pointer transition-all"
                    >
                        <div className="font-bold text-green-700 text-lg mb-2">Poursuivre</div>
                        <p className="text-xs text-slate-500">Le prospect est intéressé. Passer au financement.</p>
                    </div>

                    <div
                        onClick={() => handleDecision('REPORTER')}
                        className="group p-6 border-2 border-orange-100 bg-orange-50/50 hover:bg-orange-100/50 hover:border-orange-500 rounded-xl cursor-pointer transition-all"
                    >
                        <div className="font-bold text-orange-700 text-lg mb-2">Reporter</div>
                        <p className="text-xs text-slate-500">Décision en attente ou nouveau RDV nécessaire.</p>
                    </div>

                    <div
                        onClick={() => handleDecision('ABANDON')}
                        className="group p-6 border-2 border-red-100 bg-red-50/50 hover:bg-red-100/50 hover:border-red-500 rounded-xl cursor-pointer transition-all"
                    >
                        <div className="font-bold text-red-700 text-lg mb-2">Abandon</div>
                        <p className="text-xs text-slate-500">Pas intéressé ou hors cible.</p>
                    </div>
                </div>
            </div>
        );
    }

    // View: Initial Question (Present?)
    return (
        <div className="max-w-2xl mx-auto text-center">
            <div className="mx-auto w-16 h-16 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mb-6">
                <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Statut du Rendez-vous</h3>

            {isScheduled ? (
                <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-xl inline-block transition-all hover:shadow-md">
                    <p className="text-indigo-700 font-bold text-lg">
                        Prévu le {new Date(lead.nextCallbackAt!).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-indigo-500 font-medium">
                        à {new Date(lead.nextCallbackAt!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            ) : (
                <p className="text-slate-500 mb-8 font-medium">
                    Confirmez la présence du prospect.
                </p>
            )}
            <div className="flex gap-4 justify-center">
                <Button
                    variant="outline"
                    size="lg"
                    className="w-40 border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                    onClick={() => handleQualify(false)}
                    disabled={isLoading}
                >
                    🚫 Absent
                </Button>
                <Button
                    size="lg"
                    className="w-40 bg-slate-900 hover:bg-slate-800 text-white shadow-lg"
                    onClick={() => handleQualify(true)}
                    disabled={isLoading}
                >
                    ✅ Présent
                </Button>
            </div>
        </div>
    );
}
