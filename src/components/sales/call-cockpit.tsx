'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Globe, ShieldCheck, UserCheck, AlertTriangle, CheckCircle, Clock, X, MessageSquare, Send, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { iaOrchestrator } from '@/infrastructure/services/ia-orchestrator';
import { CallOutcome, RefusalReason } from '@/domain/entities/lead';
import { Lead, LeadStatus, LeadWithOrg } from '@/domain/entities/lead';

import { getAgencyCollaboratorsAction, confirmLeadAppointmentAction } from '@/application/actions/agenda.actions';
import { logActivityAction } from '@/application/actions/lead.actions';
import { useAuthStore } from '@/application/store/auth-store';
import { Loader2 } from 'lucide-react';

interface CallCockpitProps {
    lead: LeadWithOrg;
    onEndCall: (outcome: CallOutcome, data?: any) => void;
    recordingEnabled?: boolean;
}

export function CallCockpit({ lead, onEndCall, recordingEnabled }: CallCockpitProps) {
    const leadName = `${lead.firstName} ${lead.lastName}`;
    const organizationName = lead.organizationName;
    const [duration, setDuration] = useState(0);
    const [transcript, setTranscript] = useState<string[]>([]);

    // Scheduler state and handlers
    const [showScheduler, setShowScheduler] = useState(false);
    const [appointmentDate, setAppointmentDate] = useState('');
    const [appointmentTime, setAppointmentTime] = useState('');

    // Callback & Refusal State
    const [callbackDate, setCallbackDate] = useState('');
    const [callbackTime, setCallbackTime] = useState('');
    const [showCallbackModal, setShowCallbackModal] = useState(false);

    const [refusalReason, setRefusalReason] = useState<RefusalReason | ''>('');
    const [showRefusalModal, setShowRefusalModal] = useState(false);

    // [Step 2] Appointment & Collaborators
    const { user: activeUser } = useAuthStore();
    const [collaborators, setCollaborators] = useState<{ id: string, firstName: string, lastName: string }[]>([]);
    const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>('');
    const [isConfirming, setIsConfirming] = useState(false);

    // Handlers
    const handleAppointmentClick = () => setShowScheduler(true);
    const handleCallbackClick = () => setShowCallbackModal(true);
    const handleRefusalClick = () => setShowRefusalModal(true);

    const handleNoAnswerWhatsApp = () => {
        const cleanPhone = lead.phone.replace(/\D/g, '');
        const message = encodeURIComponent(`Bonjour ${lead.firstName}, j'ai tenté de vous joindre à l'instant concernant votre demande sur ${organizationName}. Quand seriez-vous disponible pour un court échange ?`);
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
        onEndCall(CallOutcome.NO_ANSWER, { duration });
    };

    const handleWhatsAppClick = async (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');

        if (activeUser) {
            await logActivityAction({
                leadId: lead.id,
                userId: activeUser.id,
                type: 'WHATSAPP_MSG',
                content: 'Conversation WhatsApp ouverte depuis le cockpit'
            });
        }
    };

    const handleEmailClick = async (email: string) => {
        window.open(`mailto:${email}`, '_blank');

        if (activeUser) {
            await logActivityAction({
                leadId: lead.id,
                userId: activeUser.id,
                type: 'EMAIL_SENT',
                content: 'Client mail ouvert depuis le cockpit'
            });
        }
    };

    const confirmAppointment = async () => {
        if (!appointmentDate || !appointmentTime || !selectedCollaboratorId) {
            alert("Veuillez sélectionner une date, une heure et un commercial.");
            return;
        }

        if (!lead.agencyId) {
            alert("Ce lead n'est pas associé à une agence. Impossible de fixer un RDV physique.");
            return;
        }

        setIsConfirming(true);
        const start = new Date(`${appointmentDate}T${appointmentTime}`);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 45); // Standard 45min meeting

        const res = await confirmLeadAppointmentAction({
            organisationId: lead.organizationId,
            leadId: lead.id,
            agencyId: lead.agencyId!,
            userId: selectedCollaboratorId,
            start,
            end,
            title: `RDV Agence - ${leadName}`,
            callerId: activeUser?.id || 'unknown'
        });

        setIsConfirming(false);

        if (res.success) {
            onEndCall(CallOutcome.APPOINTMENT_SET, { duration });
            setShowScheduler(false);
        } else {
            alert(res.error || "Erreur lors de la confirmation du RDV");
        }
    };

    const confirmCallback = () => {
        if (!callbackDate || !callbackTime) {
            alert("Veuillez sélectionner une date et une heure de rappel.");
            return;
        }
        const scheduledDate = new Date(`${callbackDate}T${callbackTime}`);
        onEndCall(CallOutcome.CALLBACK_SCHEDULED, { nextCallback: scheduledDate, duration });
        setShowCallbackModal(false);
    };

    const confirmRefusal = () => {
        if (!refusalReason) {
            alert("Veuillez sélectionner un motif de refus.");
            return;
        }
        onEndCall(CallOutcome.REFUSAL, { refusalReason, duration });
        setShowRefusalModal(false);
    };

    // Compliance Gates
    const [compliance, setCompliance] = useState({
        rgpdConsent: false,
        needsAnalysis: false
    });

    // AI Insights
    const [suggestion, setSuggestion] = useState<{ title: string; content: string; type: 'OBJECTION' | 'Hint' } | null>(null);

    useEffect(() => {
        // Timer
        const timer = setInterval(() => setDuration(d => d + 1), 1000);

        // Mock Live Transcription Feed
        const mockFeed = [
            { t: 2, text: "Bonjour, je suis bien chez " + leadName + " ?" },
            { t: 5, text: "Oui c'est moi." },
            { t: 8, text: "Enchanté. Je vous appelle concernant votre demande pour la formation." },
            { t: 12, text: "Ah oui, mais je trouve que c'est un peu cher..." }, // Trigger objection
            { t: 20, text: "Je comprends. Mais avez-vous vérifié votre solde CPF ?" },
            { t: 25, text: "Non pas encore." },
            { t: 30, text: "C'est très intéressant, je pense le faire." } // Trigger positive
        ];

        let timeouts: NodeJS.Timeout[] = [];

        mockFeed.forEach(msg => {
            const timeout = setTimeout(async () => {
                setTranscript(prev => [...prev, msg.text]);
                // Analyze with AI
                const analysis = await iaOrchestrator.analyzeLiveInteraction(msg.text);
                if (analysis.suggestion) {
                    setSuggestion(analysis.suggestion);
                }
            }, msg.t * 1000);
            timeouts.push(timeout);
        });

        return () => {
            clearInterval(timer);
            timeouts.forEach(clearTimeout);
        };
    }, [leadName]);

    // [Step 2] Fetch Collaborators
    useEffect(() => {
        if (lead.agencyId) {
            getAgencyCollaboratorsAction(lead.agencyId).then(res => {
                if (res.success && res.data) {
                    const saneCollaborators = res.data.map(c => ({
                        id: c.id,
                        firstName: c.firstName || '',
                        lastName: c.lastName || ''
                    }));
                    setCollaborators(saneCollaborators);
                    // Default to first or current user if in list
                    if (res.data.length > 0) {
                        const me = (res.data as any[]).find(u => u.id === activeUser?.id);
                        setSelectedCollaboratorId(me ? me.id : res.data[0].id);
                    }
                }
            });
        }
    }, [lead.agencyId, activeUser?.id]);

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const isGateOpen = compliance.rgpdConsent && compliance.needsAnalysis;

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">

            {/* Top Bar: Timer & Status */}
            <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-t-xl">
                <div className="flex items-center gap-3">
                    <div className="animate-pulse h-3 w-3 rounded-full bg-red-500" />
                    <span className="font-mono text-xl font-bold text-red-100">{formatTime(duration)}</span>
                    <span className="text-sm text-slate-400"> • En ligne avec {leadName}</span>
                    {organizationName && <span className="text-xs bg-slate-800 text-indigo-300 px-2 py-1 rounded ml-2 border border-slate-700">{organizationName}</span>}
                    {recordingEnabled && (
                        <span className="flex items-center gap-1.5 ml-3 px-2 py-0.5 bg-red-100 border border-red-200 text-red-700 rounded text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                            <Mic size={10} className="text-red-600" /> REC
                        </span>
                    )}
                </div>
                <div>
                    <Button variant="outline" size="sm" onClick={() => onEndCall(CallOutcome.NO_ANSWER, { duration })} className="text-red-600 hover:bg-red-50 border-red-200">Hang Up</Button>
                </div>
            </div>

            {/* Main Area: Split View */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Transcript & AI */}
                <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">

                    {/* AI Suggestion Card (Dynamic) */}
                    {suggestion && (
                        <div className={`p-4 rounded-lg border-l-4 shadow-sm animate-in slide-in-from-top ${suggestion.type === 'OBJECTION' ? 'bg-red-50 border-red-500 text-red-900' : 'bg-green-50 border-green-500 text-green-900'}`}>
                            <div className="flex items-center gap-2 font-bold mb-1">
                                {suggestion.type === 'OBJECTION' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                                {suggestion.title}
                            </div>
                            <p className="text-sm opacity-90">{suggestion.content}</p>
                            <button onClick={() => setSuggestion(null)} className="text-xs underline mt-2 opacity-70 hover:opacity-100">Dismiss</button>
                        </div>
                    )}

                    {/* Transcript Feed */}
                    <div className="space-y-3">
                        {transcript.map((line, i) => (
                            <div key={i} className={`p-3 rounded-lg text-sm max-w-[85%] ${i % 2 === 0 ? 'bg-indigo-100 text-indigo-900 self-end ml-auto' : 'bg-white border border-slate-200 text-slate-800'}`}>
                                {line}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Compliance & Controls */}
                <div className="w-1/3 bg-white border-l border-slate-200 p-4 flex flex-col">
                    <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <ShieldCheck size={18} className="text-indigo-600" />
                        Conformité
                    </h4>

                    <div className="space-y-4 mb-8 overflow-y-auto max-h-[60vh]">

                        {/* Lead Details Card */}
                        <div className="p-3 bg-slate-50 rounded border border-slate-200">
                            <h5 className="font-bold text-xs text-slate-500 uppercase mb-2">Infos Lead & Contact</h5>
                            <div className="text-sm space-y-1">
                                <p><span className="font-semibold">Email:</span> {lead.email}</p>
                                <p><span className="font-semibold">Ville:</span> {lead.city ? `${lead.city} (${lead.zipCode})` : 'N/A'}</p>
                                <p><span className="font-semibold">Source:</span> {lead.source}</p>
                            </div>

                            {/* Multichannel Quick Actions */}
                            <div className="mt-3 flex gap-2">
                                <Button
                                    size="sm"
                                    className="flex-1 gap-1 bg-[#25D366] hover:bg-[#128C7E] text-white h-8 text-xs border-none"
                                    onClick={() => handleWhatsAppClick(lead.phone)}
                                >
                                    <MessageSquare size={14} /> WhatsApp
                                </Button>
                                <Button
                                    size="sm"
                                    className="flex-1 gap-1 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs border-none"
                                    onClick={() => handleEmailClick(lead.email)}
                                >
                                    <Mail size={14} /> Email
                                </Button>
                            </div>
                        </div>

                        <label className={`flex items-start gap-3 p-3 rounded border transition-all cursor-pointer ${compliance.rgpdConsent ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                            <input
                                type="checkbox"
                                checked={compliance.rgpdConsent}
                                onChange={e => setCompliance(c => ({ ...c, rgpdConsent: e.target.checked }))}
                                className="mt-1"
                            />
                            <div className="text-sm">
                                <span className="font-semibold block">Consentement RGPD</span>
                                <span className="text-xs text-slate-500">Informer de l'enregistrement.</span>
                            </div>
                        </label>

                        <label className={`flex items-start gap-3 p-3 rounded border transition-all cursor-pointer ${compliance.needsAnalysis ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                            <input
                                type="checkbox"
                                checked={compliance.needsAnalysis}
                                onChange={e => setCompliance(c => ({ ...c, needsAnalysis: e.target.checked }))}
                                className="mt-1"
                            />
                            <div className="text-sm">
                                <span className="font-semibold block">Découverte Besoins</span>
                                <span className="text-xs text-slate-500">Projet pro validé ?</span>
                            </div>
                        </label>
                    </div>

                    <div className="mt-auto space-y-2">
                        <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Issue de l'appel</p>
                        <Button
                            variant="primary"
                            className="w-full bg-green-600 hover:bg-green-700 gap-2"
                            disabled={!isGateOpen}
                            onClick={handleAppointmentClick}
                        >
                            <UserCheck size={16} />
                            RDV / Vente Validée
                        </Button>
                        <Button variant="outline" className="w-full" onClick={handleCallbackClick}>
                            Rappel nécessaire
                        </Button>
                        <Button variant="ghost" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleRefusalClick}>
                            Refus / Pas intéressé
                        </Button>

                        <div className="pt-2 border-t border-slate-100 flex gap-2">
                        </div>
                    </div>
                </div>
            </div>

            {/* Appointment Scheduler Modal Overlay */}
            {showScheduler && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
                    <Card className="w-full max-w-md p-6 bg-white shadow-xl animate-in zoom-in-95">
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <UserCheck className="text-green-600" />
                            Planifier le Rendez-vous
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Sélectionnez un créneau pour valider la qualification de <strong>{leadName}</strong>.
                        </p>

                        <div className="space-y-4 mb-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Date du RDV</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border rounded-md"
                                    value={appointmentDate}
                                    onChange={(e) => setAppointmentDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Heure</label>
                                <input
                                    type="time"
                                    className="w-full p-2 border rounded-md"
                                    value={appointmentTime}
                                    onChange={(e) => setAppointmentTime(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Commercial Showroom</label>
                                <select
                                    className="w-full p-2 border rounded-md bg-white"
                                    value={selectedCollaboratorId}
                                    onChange={(e) => setSelectedCollaboratorId(e.target.value)}
                                >
                                    <option value="" disabled>Sélectionner un commercial</option>
                                    {collaborators.map(collab => (
                                        <option key={collab.id} value={collab.id}>
                                            {collab.firstName} {collab.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded text-sm text-indigo-700">
                                ℹ️ Ce RDV sera synchronisé avec l'agenda de l'agence.
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setShowScheduler(false)} disabled={isConfirming}>Annuler</Button>
                            <Button className="bg-green-600 hover:bg-green-700" onClick={confirmAppointment} disabled={isConfirming}>
                                {isConfirming ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                                Valider le RDV
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Callback Scheduler Modal */}
            {showCallbackModal && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
                    <Card className="w-full max-w-md p-6 bg-white shadow-xl animate-in zoom-in-95">
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Clock className="text-indigo-600" />
                            Programmer un Rappel
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Quand souhaitez-vous rappeler <strong>{leadName}</strong> ?
                        </p>

                        <div className="space-y-4 mb-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Date de rappel</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border rounded-md"
                                    value={callbackDate}
                                    onChange={(e) => setCallbackDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Heure</label>
                                <input
                                    type="time"
                                    className="w-full p-2 border rounded-md"
                                    value={callbackTime}
                                    onChange={(e) => setCallbackTime(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setShowCallbackModal(false)}>Annuler</Button>
                            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={confirmCallback}>
                                Programmer
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Refusal Reason Modal */}
            {showRefusalModal && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
                    <Card className="w-full max-w-md p-6 bg-white shadow-xl animate-in zoom-in-95 border-red-200">
                        <h3 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
                            <X className="text-red-600" />
                            Motif du Refus
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Pourquoi le lead <strong>{leadName}</strong> n'est-il pas intéressé ? Ce motif est obligatoire pour l'archivage.
                        </p>

                        <div className="space-y-2 mb-6">
                            {[
                                { id: 'PRICE', label: 'Prix / Reste à charge' },
                                { id: 'COMPETITION', label: 'Concurrence / Déjà inscrit ailleurs' },
                                { id: 'NO_PROJECT', label: 'Pas de projet / Curiosité' },
                                { id: 'OTHER', label: 'Autre' }
                            ].map(reason => (
                                <button
                                    key={reason.id}
                                    onClick={() => setRefusalReason(reason.id as RefusalReason)}
                                    className={`w-full p-3 rounded text-left border transition-all ${refusalReason === reason.id ? 'bg-red-50 border-red-500 text-red-800' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                >
                                    {reason.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setShowRefusalModal(false)}>Annuler</Button>
                            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmRefusal}>
                                Confirmer le Refus
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
