'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CallCockpit } from './call-cockpit';
import { LeadWithOrg, CallOutcome, RefusalReason } from '@/domain/entities/lead';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, X } from 'lucide-react';
import { logCallAction } from '@/application/actions/activity.actions';

interface PhoningSessionModalProps {
    leads: LeadWithOrg[];
    onClose: () => void;
}

export function PhoningSessionModal({ leads, onClose }: PhoningSessionModalProps) {
    console.log('PhoningSessionModal mounted with leads:', leads);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [results, setResults] = useState<{ leadId: string; outcome: CallOutcome }[]>([]);

    const currentLead = leads[currentIndex];

    // Safety check: if no leads provided
    if (!currentLead) {
        return createPortal(
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center space-y-6">
                    <div className="h-20 w-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Aucun Lead à Traiter</h2>
                    <p className="text-slate-500">
                        Il n'y a aucun prospect correspondant aux critères de phoning (Pas de 'PROSPECTION' ou rappels en retard).
                    </p>
                    <Button onClick={onClose} className="w-full bg-slate-900 text-white hover:bg-slate-800">
                        Retour au Cockpit
                    </Button>
                </div>
            </div>,
            document.body
        );
    }

    const isFinished = currentIndex >= leads.length;

    const [isInTransition, setIsInTransition] = useState(false);

    const handleEndCall = async (outcome: CallOutcome, data?: any) => {
        // Record result locally
        setResults(prev => [...prev, { leadId: currentLead.id, outcome }]);

        // Persist to database
        await logCallAction(
            currentLead.id,
            outcome as any, // Type cast for compatibility
            data?.duration || 0,
            data?.notes,
            data?.nextCallback,
            data?.refusalReason as RefusalReason | undefined
        );

        setIsInTransition(true);
    };

    const handleNextLead = () => {
        setIsInTransition(false);
        setCurrentIndex(prev => prev + 1);
    };

    const nextLead = leads[currentIndex + 1];

    if (isInTransition) {
        if (!nextLead) {
            // End of session, move index to trigger summary
            handleNextLead();
            return null;
        }

        return createPortal(
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm animate-in fade-in">
                <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
                    <div className="bg-indigo-600 p-6 text-white text-center">
                        <CheckCircle className="mx-auto h-12 w-12 mb-3 text-indigo-200" />
                        <h3 className="text-2xl font-bold">Appel Terminé</h3>
                        <p className="text-indigo-100">Passons au lead suivant.</p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="text-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prochain Lead</span>
                            <h2 className="text-3xl font-black text-slate-900 mt-1">{nextLead.firstName} {nextLead.lastName}</h2>
                            <p className="text-slate-500 font-medium">{nextLead.organizationName}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="block text-slate-400 text-xs font-bold uppercase">Ville</span>
                                <span className="font-semibold text-slate-700">{nextLead.city || 'Non renseigné'}</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="block text-slate-400 text-xs font-bold uppercase">Source</span>
                                <span className="font-semibold text-slate-700">{nextLead.source}</span>
                            </div>
                        </div>

                        <Button onClick={handleNextLead} className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                            Lancer l'appel <ArrowRight className="ml-2" />
                        </Button>

                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="flex-1 text-slate-600 border-slate-300 hover:bg-slate-50"
                            >
                                Faire une pause
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="flex-1 text-red-600 hover:bg-red-50"
                            >
                                Terminer la session
                            </Button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    if (results.length > 0 && isFinished) {
        return createPortal(
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center space-y-6">
                    <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Session Terminée !</h2>
                    <p className="text-slate-500">
                        Vous avez traité {leads.length} leads. Voici le résumé de votre session de phoning.
                    </p>

                    <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">RDV Fixés</span>
                            <span className="font-bold text-green-600">
                                {results.filter(r => r.outcome === 'APPOINTMENT_SET').length}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Rappels Prévus</span>
                            <span className="font-bold text-indigo-600">
                                {results.filter(r => r.outcome === 'CALLBACK_SCHEDULED').length}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Refus / Pas de rép.</span>
                            <span className="font-bold text-slate-700">
                                {results.filter(r => !['APPOINTMENT_SET', 'CALLBACK_SCHEDULED'].includes(r.outcome)).length}
                            </span>
                        </div>
                    </div>

                    <Button onClick={onClose} className="w-full bg-slate-900 text-white hover:bg-slate-800">
                        Retour au Cockpit
                    </Button>
                </div>
            </div>,
            document.body
        );
    }


    // Reuse the CallCockpit layout but inject it into a modal container
    return createPortal(
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-900">
            {/* Session Header Overlay */}
            <div className="bg-slate-900 text-white px-6 py-2 flex justify-between items-center border-b border-white/10">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-indigo-400">SESSION MODE</span>
                    <span className="text-sm text-slate-400">
                        Appel {currentIndex + 1} / {leads.length}
                    </span>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
                    <X size={18} className="mr-2" /> Quitter la session
                </Button>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-slate-50 relative">
                <CallCockpit
                    lead={currentLead}
                    onEndCall={handleEndCall}
                    recordingEnabled={true} // Force enable for session mode or fetch from config
                />
            </div>
        </div>,
        document.body
    );
}

