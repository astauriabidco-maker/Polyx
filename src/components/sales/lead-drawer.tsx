import { X, Phone, Calendar, MessageSquare, Clock, TrendingUp, PhoneOff, AlertCircle, Send, RefreshCcw, Loader2, Link, Mail } from 'lucide-react';
import { CommunicationModal } from '../communication/communication-modal';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '@/application/store/auth-store';
import { Lead, LeadStatus, CallOutcome, LeadWithOrg } from '@/domain/entities/lead';
import { Button } from '@/components/ui/button';
import { LeadService } from '@/application/services/lead.service';
import { CallCockpit } from './call-cockpit';
import ActivityTimeline from '@/components/crm/ActivityTimeline';
import CallLogModal from '@/components/crm/CallLogModal';

import { updateLeadAction, getSalesRepsAction, refreshLeadScoreAction, logCallAction, logActivityAction } from '@/application/actions/lead.actions';
import { ScriptService } from '@/application/services/script.service';
import { getVoiceSettingsAction } from '@/application/actions/communication.actions';

// New Sub-components
import { LeadScheduleModal } from './drawer/LeadScheduleModal';
import { LeadInsights } from './drawer/LeadInsights';
import { NurturingStatus } from './drawer/NurturingStatus';
import { CallInsights } from './drawer/CallInsights';

interface LeadDrawerProps {
    lead: LeadWithOrg | null;
    onClose: () => void;
    onUpdate: (updatedLead: Lead) => void;
}

export function LeadDrawer({ lead, onClose, onUpdate }: LeadDrawerProps) {
    const { user: activeUser } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
    const [isCallActive, setIsCallActive] = useState(false);
    const [showCallLogModal, setShowCallLogModal] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const [isRecordingEnabled, setIsRecordingEnabled] = useState(false);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [salesReps, setSalesReps] = useState<{ id: string, name: string }[]>([]);

    const [editForm, setEditForm] = useState(() => ({
        firstName: lead?.firstName || '',
        lastName: lead?.lastName || '',
        email: lead?.email || '',
        phone: lead?.phone || '',
        source: (lead?.source as string) || '',
        street: lead?.street || '',
        zipCode: lead?.zipCode || '',
        city: lead?.city || '',
        examId: lead?.examId || '',
        agencyId: lead?.agencyId || '',
        assignedUserId: lead?.assignedUserId || '',
        jobStatus: (lead as any)?.jobStatus || ''
    }));

    // Modal Visibility State
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
    const [isSharingLink, setIsSharingLink] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (lead) {
            document.body.style.overflow = 'hidden';
            setIsCallActive(false);

            // Fetch Sales Reps for assignment
            getSalesRepsAction(lead.organizationId).then(res => {
                if (res.success && res.users) {
                    setSalesReps(res.users);
                }
            });

            // Fetch VoIP/Recording settings
            getVoiceSettingsAction(lead.organizationId).then(res => {
                if (res.success && res.data) {
                    setIsVoiceEnabled((res.data as any).voiceEnabled || false);
                    setIsRecordingEnabled((res.data as any).recordingEnabled || false);
                }
            });
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const [isRefreshingScore, setIsRefreshingScore] = useState(false);

    const handleRefreshScore = async () => {
        if (!lead || isRefreshingScore) return;
        setIsRefreshingScore(true);
        const result = await refreshLeadScoreAction(lead.id);
        if (result.success && result.newScore !== undefined) {
            onUpdate({ ...lead, score: result.newScore! });
        }
        setIsRefreshingScore(false);
    };

    const handleSave = async () => {
        if (!lead) return;

        const updates: Partial<Lead> = {
            ...editForm,
            examId: editForm.examId || undefined,
            agencyId: editForm.agencyId || undefined
        };

        const result = await updateLeadAction(lead.id, updates);
        if (result.success && result.lead) {
            onUpdate(result.lead);
            setIsEditing(false);
        } else {
            alert('Failed to update lead');
        }
    };

    if (!mounted || !lead) return null;

    const startCall = () => {
        if (!isVoiceEnabled) {
            alert("La téléphonie n'est pas activée pour votre organisation. Veuillez la configurer dans les réglages.");
            return;
        }
        setIsCallActive(true);
    };

    const handleWhatsAppCall = async () => {
        if (!lead?.phone) return;

        const cleanPhone = lead.phone.replace(/\D/g, '');
        const waUrl = `https://wa.me/${cleanPhone}`;

        window.open(waUrl, '_blank');

        await logActivityAction({
            leadId: lead.id,
            type: 'CONTACT_ATTEMPT',
            content: 'Appel WhatsApp initié',
            userId: activeUser?.id || 'SYSTEM',
            metadata: { channel: 'WHATSAPP_CALL' }
        });
    };


    const endCall = async (outcome: CallOutcome, data?: any) => {
        setIsCallActive(false);
        if (!lead) return;

        const duration = data?.duration || 0;
        await logCallAction({
            leadId: lead.id,
            duration,
            outcome,
            notes: outcome === CallOutcome.APPOINTMENT_SET ? 'RDV pris via Cockpit' : 'Appel via Cockpit',
            callerId: activeUser?.id || 'SYSTEM'
        });

        const updatedLogic = LeadService.registerInteraction(lead, activeUser?.id || 'SYSTEM', outcome, {
            note: outcome === CallOutcome.APPOINTMENT_SET ? 'RDV pris via Cockpit' : 'Logged from Cockpit'
        });

        const result = await updateLeadAction(lead.id, updatedLogic);

        if (result.success && result.lead) {
            onUpdate(result.lead);
        } else {
            onUpdate(updatedLogic);
            console.error("Failed to persist call outcome");
        }

        if (outcome === CallOutcome.APPOINTMENT_SET) {
            alert('Félicitations ! Vente/RDV validé. Le dossier est transféré au Closing.');
            onClose();
        } else if (outcome === CallOutcome.REFUSAL) {
            onClose();
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex justify-end">
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                onClick={onClose}
            />

            <div
                className={`relative w-full ${isCallActive ? 'max-w-4xl' : 'max-w-md'} bg-white shadow-2xl h-full flex flex-col transition-all`}
                onClick={(e) => e.stopPropagation()}
            >

                {isCallActive ? (
                    <CallCockpit
                        lead={lead}
                        onEndCall={endCall}
                        recordingEnabled={isRecordingEnabled}
                    />
                ) : (
                    <>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                            <div className="flex-1 mr-4">
                                {isEditing ? (
                                    <div className="space-y-2 mb-2">
                                        <div className="flex gap-2">
                                            <input
                                                className="flex-1 text-lg font-bold border rounded p-1 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                                                value={editForm.firstName}
                                                onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                                                placeholder="First Name"
                                                autoFocus
                                            />
                                            <input
                                                className="flex-1 text-lg font-bold border rounded p-1"
                                                value={editForm.lastName}
                                                onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                                                placeholder="Last Name"
                                            />
                                        </div>
                                        <input
                                            className="w-full text-sm border rounded p-1"
                                            value={editForm.email}
                                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                            placeholder="Email"
                                        />
                                        <input
                                            className="w-full text-sm border rounded p-1"
                                            value={editForm.phone}
                                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                            placeholder="Phone"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="text-xl font-bold text-slate-900">{lead.firstName} {lead.lastName}</h2>
                                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-xs font-medium text-slate-700">{lead.status}</span>
                                        </div>
                                        {lead.organizationName && (
                                            <div className="flex items-center gap-1 mb-2">
                                                <span className="text-[10px] uppercase font-bold text-slate-400">On behalf of</span>
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{lead.organizationName}</span>
                                            </div>
                                        )}
                                        <p className="text-sm text-slate-500">{lead.email}</p>
                                        <p className="text-sm text-slate-500">{lead.phone}</p>
                                    </>
                                )}
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex border-b border-slate-100">
                            <button
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setActiveTab('overview')}
                            >
                                Overview
                            </button>
                            <button
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setActiveTab('history')}
                            >
                                History & Logs
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    {/* AI Call Insights - Prominent Location */}
                                    <CallInsights
                                        leadId={lead.id}
                                        onUpdate={() => onUpdate({ ...lead as any })}
                                    />

                                    <div className="flex justify-end gap-2 mb-2">
                                        {isEditing ? (
                                            <>
                                                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="h-8">Cancel</Button>
                                                <Button size="sm" onClick={handleSave} className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white">Save</Button>
                                            </>
                                        ) : (
                                            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 text-slate-500 hover:text-indigo-600">
                                                Edit
                                            </Button>
                                        )}
                                    </div>

                                    <div className="p-3 bg-indigo-50/50 rounded border border-indigo-100">
                                        <p className="text-xs text-indigo-400 uppercase font-semibold mb-1">Commercial Assigné</p>
                                        {isEditing ? (
                                            <select
                                                className="w-full text-sm p-1 border rounded bg-white"
                                                value={editForm.assignedUserId}
                                                onChange={e => setEditForm({ ...editForm, assignedUserId: e.target.value })}
                                            >
                                                <option value="">-- Non Assigné --</option>
                                                {salesReps.map(rep => (
                                                    <option key={rep.id} value={rep.id}>{rep.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-indigo-200 flex items-center justify-center text-xs text-indigo-700 font-bold">
                                                    {salesReps.find(r => r.id === lead.assignedUserId)?.name.charAt(0) || '?'}
                                                </div>
                                                <span className="text-sm font-medium text-slate-900">
                                                    {salesReps.find(r => r.id === lead.assignedUserId)?.name || 'Non Assigné'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-slate-50 rounded border border-slate-100">
                                            <p className="text-xs text-slate-400 uppercase font-semibold">Source</p>
                                            {isEditing ? (
                                                <input
                                                    className="w-full text-sm p-1 border rounded"
                                                    value={editForm.source}
                                                    onChange={e => setEditForm({ ...editForm, source: e.target.value })}
                                                />
                                            ) : (
                                                <p className="font-medium text-slate-900">{lead.source}</p>
                                            )}
                                        </div>

                                        {/* EXTRACTED: LeadInsights */}
                                        <LeadInsights
                                            lead={lead}
                                            isRefreshingScore={isRefreshingScore}
                                            onRefreshScore={handleRefreshScore}
                                        />


                                        <div className="p-3 bg-slate-50 rounded border border-slate-100">
                                            <p className="text-xs text-slate-400 uppercase font-semibold">Exam</p>
                                            {isEditing ? (
                                                <input
                                                    className="w-full text-sm p-1 border rounded"
                                                    value={editForm.examId}
                                                    onChange={e => setEditForm({ ...editForm, examId: e.target.value })}
                                                />
                                            ) : (
                                                <p className="font-medium text-slate-900">{lead.examId || 'N/A'}</p>
                                            )}
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded border border-slate-100">
                                            <p className="text-xs text-slate-400 uppercase font-semibold">Agence</p>
                                            {isEditing ? (
                                                <input
                                                    className="w-full text-sm p-1 border rounded"
                                                    value={editForm.agencyId}
                                                    onChange={e => setEditForm({ ...editForm, agencyId: e.target.value })}
                                                />
                                            ) : (
                                                <p className="font-medium text-slate-900">{lead.agencyId || 'N/A'}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded border border-slate-100 space-y-4">
                                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <TrendingUp size={16} className="text-indigo-600" />
                                            Informations Complémentaires
                                        </h4>
                                        <div>
                                            <label className="text-xs text-slate-400 font-semibold uppercase">Situation Professionnelle</label>
                                            {isEditing ? (
                                                <select
                                                    className="w-full text-sm p-1 border rounded bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                                                    value={editForm.jobStatus}
                                                    onChange={e => setEditForm({ ...editForm, jobStatus: e.target.value })}
                                                >
                                                    <option value="">-- Sélectionner --</option>
                                                    <option value="SALARIE">Salarié(e)</option>
                                                    <option value="CDI">CDI</option>
                                                    <option value="CDD">CDD</option>
                                                    <option value="INDEPENDANT">Indépendant / Freelance</option>
                                                    <option value="CHOMAGE">Au Chômage</option>
                                                    <option value="RETRAITE">Retraité(e)</option>
                                                    <option value="ETUDIANT">Étudiant(e)</option>
                                                    <option value="AUTRE">Autre</option>
                                                </select>
                                            ) : (
                                                <p className="font-medium text-slate-900">{(lead as any)?.jobStatus || 'N/A'}</p>
                                            )}
                                        </div>
                                    </div>

                                    <NurturingStatus
                                        lead={lead}
                                        onUpdate={() => onUpdate({ ...lead })}
                                    />

                                    <div className="p-4 bg-slate-50 rounded border border-slate-100 space-y-2">
                                        <h4 className="text-sm font-bold text-slate-700">Coordonnées & Adresse</h4>
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <input
                                                    className="w-full text-sm p-1 border rounded"
                                                    placeholder="Street"
                                                    value={editForm.street}
                                                    onChange={e => setEditForm({ ...editForm, street: e.target.value })}
                                                />
                                                <div className="flex gap-2">
                                                    <input
                                                        className="w-1/3 text-sm p-1 border rounded"
                                                        placeholder="Zip"
                                                        value={editForm.zipCode}
                                                        onChange={e => setEditForm({ ...editForm, zipCode: e.target.value })}
                                                    />
                                                    <input
                                                        className="flex-1 text-sm p-1 border rounded"
                                                        placeholder="City"
                                                        value={editForm.city}
                                                        onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-sm text-slate-600">{lead.street ? lead.street : 'Rue non renseignée'}</p>
                                                <p className="text-sm text-slate-600">{lead.zipCode} {lead.city}</p>
                                            </>
                                        )}
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded border border-slate-100 space-y-2">
                                        <h4 className="text-sm font-bold text-slate-700">Dates Clés</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-slate-400">Consentement</p>
                                                <p className="text-sm font-medium">{lead.consentDate ? new Date(lead.consentDate).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400">Réponse</p>
                                                <p className="text-sm font-medium">{lead.responseDate ? new Date(lead.responseDate).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center px-1">
                                        <h4 className="text-sm font-medium text-slate-400 mb-2">Contexte du Lead</h4>
                                    </div>
                                    <div className="p-4 bg-yellow-50 text-yellow-800 rounded text-sm border border-yellow-100 flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 mt-0.5 opacity-50" />
                                        <div className="flex-1">
                                            <p className="font-bold mb-1">Intention de formation</p>
                                            <p>User expressed interest via {lead.source}.</p>
                                            {lead.examId && (
                                                <div className="mt-3 p-3 bg-white/60 rounded border border-yellow-200">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">Offre Suggérée</p>
                                                            <p className="font-bold text-slate-900">
                                                                {lead.examId === '1' || lead.examId === 'TOEIC-LR' ? 'Pack Préparation TOEIC (30h)' :
                                                                    lead.examId === '3' ? 'Pack Coaching TOEFL (20h)' :
                                                                        'Pack de formation spécifique'}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-black text-indigo-600">
                                                                {lead.examId === '1' || lead.examId === 'TOEIC-LR' ? '1 490 €' : lead.examId === '3' ? '1 190 €' : 'Sur devis'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'history' && lead && (
                                <ActivityTimeline leadId={lead.id} />
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-3">
                            <Button className="flex-1 min-w-[120px] gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={startCall}>
                                <Phone size={16} /> Cockpit Call
                            </Button>
                            <Button
                                className="flex-1 min-w-[120px] gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white border-none"
                                onClick={handleWhatsAppCall}
                            >
                                <Phone size={16} /> WhatsApp Call
                            </Button>

                            <Button
                                className="flex-1 min-w-[120px] gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={() => setIsWhatsAppOpen(true)}
                            >
                                <Send size={16} /> Relancer
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 min-w-[120px] gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                                onClick={() => setIsSharingLink(true)}
                            >
                                <Link size={16} /> Partager Lien
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 min-w-[120px] gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                                onClick={() => setShowCallLogModal(true)}
                            >
                                <PhoneOff size={16} /> Log Appel
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 min-w-[120px] gap-2 border-amber-400 text-amber-700 hover:bg-amber-50"
                                onClick={() => setShowScheduleModal(true)}
                            >
                                <Calendar size={16} /> Fixer RDV
                            </Button>
                        </div>
                    </>
                )}

                {/* Call Log Modal */}
                {showCallLogModal && lead && (
                    <CallLogModal
                        leadId={lead.id}
                        leadName={`${lead.firstName} ${lead.lastName}`}
                        onClose={() => setShowCallLogModal(false)}
                        onSuccess={() => setActiveTab('history')}
                    />
                )}

                {/* EXTRACTED: LeadScheduleModal */}
                {showScheduleModal && (
                    <LeadScheduleModal
                        lead={lead}
                        callerId={activeUser?.id || 'SYSTEM'}
                        salesReps={salesReps}
                        onClose={() => setShowScheduleModal(false)}
                        onUpdate={(data) => {
                            onUpdate({
                                ...lead,
                                status: data.status,
                                nextCallbackAt: data.nextCallbackAt
                            });
                            if (data.status === LeadStatus.RDV_FIXE) onClose();
                        }}
                    />
                )}

                {/* Communication Modal */}
                {isWhatsAppOpen && lead && (
                    <CommunicationModal
                        leadIds={[lead.id]}
                        onClose={() => setIsWhatsAppOpen(false)}
                        onSuccess={() => {
                            setIsWhatsAppOpen(false);
                            onUpdate(lead);
                        }}
                        title={`Relancer ${lead.firstName}`}
                    />
                )}

                {/* Sharing Booking Link Modal */}
                {isSharingLink && lead && (
                    <CommunicationModal
                        leadIds={[lead.id]}
                        onClose={() => setIsSharingLink(false)}
                        onSuccess={() => {
                            setIsSharingLink(false);
                            onUpdate(lead);
                        }}
                        title={`Partager lien de réservation`}
                        defaultMessage={`Bonjour ${lead.firstName}, vous pouvez réserver un créneau dans mon calendrier via ce lien : ${window.location.protocol}//${window.location.host}/book/${lead.assignedUserId}`}
                        defaultSubject={`Lien de réservation - ${lead.organizationName || 'Polyx'}`}
                    />
                )}
            </div>
        </div>,
        document.body
    );
}
