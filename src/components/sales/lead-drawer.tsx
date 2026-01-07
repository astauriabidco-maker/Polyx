import { X, Phone, Calendar, MessageSquare, Clock, TrendingUp, PhoneOff, AlertCircle, Send, RefreshCcw, Loader2 } from 'lucide-react';
import { CommunicationModal } from '../communication/communication-modal';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lead, LeadStatus, CallOutcome, LeadWithOrg } from '@/domain/entities/lead';
import { Button } from '@/components/ui/button';
import { LeadService } from '@/application/services/lead.service';
import { CallCockpit } from './call-cockpit';
import ActivityTimeline from '@/components/crm/ActivityTimeline';
import CallLogModal from '@/components/crm/CallLogModal';

import { updateLeadAction, getSalesRepsAction, refreshLeadScoreAction } from '@/application/actions/lead.actions'; // [UPDATED]
import { createAppointmentAction } from '@/application/actions/agenda.actions'; // [NEW] Quick Booking
import { ScriptService } from '@/application/services/script.service';
// [REMOVED DUPLICATE]
// Removed: import { sendWhatsAppAction, getWhatsAppTemplatesAction } from '@/application/actions/communication.actions'; // [NEW]

interface LeadDrawerProps {
    lead: LeadWithOrg | null;
    onClose: () => void;
    onUpdate: (updatedLead: Lead) => void;
}

export function LeadDrawer({ lead, onClose, onUpdate }: LeadDrawerProps) {
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
    const [isCallActive, setIsCallActive] = useState(false);
    const [showCallLogModal, setShowCallLogModal] = useState(false);

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

    // Offline Schedule State
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [isQuickBooking, setIsQuickBooking] = useState(false);

    // WhatsApp State (now used for CommunicationModal)
    const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
    // Removed: const [waTemplates, setWaTemplates] = useState<any[]>([]);
    // Removed: const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    // Removed: const [waMessage, setWaMessage] = useState('');
    // Removed: const [isWaSending, setIsWaSending] = useState(false);

    const handleScheduleClick = () => {
        setShowScheduleModal(true);
    };

    const handleScheduleSave = () => {
        if (!lead || !scheduleDate || !scheduleTime) {
            alert("Veuillez sélectionner une date et une heure.");
            return;
        }

        const scheduledDate = new Date(`${scheduleDate}T${scheduleTime} `);

        // Use LeadService to register the interaction (Outcome: CALLBACK_SCHEDULED)
        const updated = LeadService.registerInteraction(lead, 'current-user-id', CallOutcome.CALLBACK_SCHEDULED, {
            nextCallback: scheduledDate,
            note: 'Manual scheduling via Drawer'
        });

        onUpdate(updated);
        setShowScheduleModal(false);
        setScheduleDate('');
        setScheduleTime('');
    };

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
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []); // Only on mount (which happens on key change now)

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

    // Removed: const handleOpenWhatsApp = async () => {
    // Removed:     setIsWhatsAppOpen(true);
    // Removed:     const res = await getWhatsAppTemplatesAction(lead!.organizationId);
    // Removed:     if (res.success && res.data) {
    // Removed:         setWaTemplates(res.data);
    // Removed:     }
    // Removed: };

    // Removed: const handleSendWhatsApp = async () => {
    // Removed:     if (!lead || !waMessage) return;
    // Removed:     setIsWaSending(true);
    // Removed:     const res = await sendWhatsAppAction(lead.organizationId, lead.phone || '', waMessage);
    // Removed:     if (res.success) {
    // Removed:         alert('✅ Message WhatsApp envoyé !');
    // Removed:         setIsWhatsAppOpen(false);
    // Removed:         setWaMessage('');
    // Removed:     } else {
    // Removed:         alert(res.error);
    // Removed:     }
    // Removed:     setIsWaSending(false);
    // Removed: };

    // Removed: const handleTemplateChange = (templateId: string) => {
    // Removed:     setSelectedTemplate(templateId);
    // Removed:     const template = waTemplates.find(t => t.id === templateId);
    // Removed:     if (template && lead) {
    // Removed:         let body = template.body
    // Removed:             .replace('{{firstName}}', lead.firstName)
    // Removed:             .replace('{{senderName}}', 'Votre conseiller')
    // Removed:             .replace('{{orgName}}', lead.organizationName || 'Polyx')
    // Removed:             .replace('{{training}}', lead.examId || 'votre formation');
    // Removed:         setWaMessage(body);
    // Removed:     }
    // Removed: };

    const handleSave = async () => {
        if (!lead) return;

        // Prepare updates
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
        setIsCallActive(true);
    };

    const endCall = async (outcome: CallOutcome) => {
        setIsCallActive(false);

        // Use the Service to update lead
        const updatedLogic = LeadService.registerInteraction(lead, 'current-user-id', outcome, {
            note: outcome === CallOutcome.APPOINTMENT_SET ? 'RDV taken via Cockpit' : 'Logged from Cockpit'
        });

        // PERSIST CHANGE TO DB
        const result = await updateLeadAction(lead.id, updatedLogic);

        if (result.success && result.lead) {
            onUpdate(result.lead);
        } else {
            // Fallback (optimistic update turned out specific)
            onUpdate(updatedLogic);
            console.error("Failed to persist call outcome");
        }

        if (outcome === CallOutcome.APPOINTMENT_SET) {
            alert('Félicitations ! Vente/RDV validé. Le dossier est transféré au Closing.');
            onClose();
        } else if (outcome === CallOutcome.REFUSAL) {
            onClose(); // Close on refusal too
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div
                className={`relative w - full ${isCallActive ? 'max-w-4xl' : 'max-w-md'} bg - white shadow - 2xl h - full flex flex - col transition - all`}
                onClick={(e) => e.stopPropagation()}
            >

                {isCallActive ? (
                    <CallCockpit
                        lead={lead}
                        onEndCall={endCall}
                    />
                ) : (
                    <>
                        {/* Header */}
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

                        {/* Tabs */}
                        <div className="flex border-b border-slate-100">
                            <button
                                className={`flex - 1 py - 3 text - sm font - medium border - b - 2 transition - colors ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'} `}
                                onClick={() => setActiveTab('overview')}
                            >
                                Overview
                            </button>
                            <button
                                className={`flex - 1 py - 3 text - sm font - medium border - b - 2 transition - colors ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'} `}
                                onClick={() => setActiveTab('history')}
                            >
                                History & Logs
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    {/* Edit / Save Actions */}
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

                                    {/* Assignment Section */}
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
                                        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <TrendingUp size={14} className="text-indigo-500" />
                                                    Insights Scoring IA
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={handleRefreshScore}
                                                        disabled={isRefreshingScore}
                                                        className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-indigo-400"
                                                        title="Recalculer le score prédictif"
                                                    >
                                                        <RefreshCcw size={12} className={isRefreshingScore ? 'animate-spin' : ''} />
                                                    </button>
                                                    <div className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 rounded text-indigo-400 text-xs font-bold">
                                                        {lead.score}% Probabilité
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {LeadService.getScoringInsights(lead).map((insight, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-slate-950/50 border border-slate-800/50">
                                                        <span className="text-lg">{insight.icon}</span>
                                                        <span className={`text - xs font - medium ${insight.type === 'positive' ? 'text-emerald-400' :
                                                            insight.type === 'negative' ? 'text-rose-400' :
                                                                'text-yellow-400'
                                                            } `}>
                                                            {insight.label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
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

                                    {/* Informations Complémentaires */}
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

                                    {/* [NEW] Dynamic Sales Script */}
                                    <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/20 rounded-xl p-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <MessageSquare size={16} className="text-indigo-400" />
                                            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Guide d'Entretien (IA)</h4>
                                        </div>
                                        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                            {ScriptService.getCallScript(lead).split('\n').map((line, i) => {
                                                if (line.startsWith('###')) return <h5 key={i} className="font-bold text-slate-100 mb-2 mt-2">{line.replace('###', '')}</h5>;
                                                const parts = line.split(/(\*\*.*?\*\*)/g);
                                                return (
                                                    <p key={i} className="mb-1">
                                                        {parts.map((p, j) => p.startsWith('**') ? <strong key={j} className="text-white bg-white/5 px-1 rounded">{p.replace(/\*\*/g, '')}</strong> : p)}
                                                    </p>
                                                );
                                            })}
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

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                            <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={startCall}>
                                <Phone size={16} /> Cockpit Call
                            </Button>
                            <Button
                                className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={() => setIsWhatsAppOpen(true)}
                            >
                                <Send size={16} /> Relancer
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                                onClick={() => setShowCallLogModal(true)}
                            >
                                <PhoneOff size={16} /> Log Appel
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 gap-2 border-amber-400 text-amber-700 hover:bg-amber-50"
                                onClick={async () => {
                                    if (!lead?.agencyId) {
                                        alert('Ce lead n\'est pas associé à une agence.');
                                        return;
                                    }
                                    setIsQuickBooking(true);
                                    const scheduledDate = new Date();
                                    scheduledDate.setDate(scheduledDate.getDate() + 1);
                                    scheduledDate.setHours(10, 0, 0, 0);

                                    const endDate = new Date(scheduledDate);
                                    endDate.setMinutes(endDate.getMinutes() + 45);

                                    const res = await createAppointmentAction({
                                        organisationId: lead.organizationId,
                                        agencyId: lead.agencyId,
                                        leadId: lead.id,
                                        userId: lead.assignedUserId || 'unknown',
                                        title: `RDV Agence - ${lead.firstName} ${lead.lastName} `,
                                        type: 'MEETING',
                                        start: scheduledDate,
                                        end: endDate
                                    });

                                    setIsQuickBooking(false);
                                    if (res.success) {
                                        alert('✅ Rendez-vous en Agence réservé pour demain 10h !');
                                    } else {
                                        alert(`Erreur: ${res.error} `);
                                    }
                                }}
                                disabled={isQuickBooking}
                            >
                                {isQuickBooking ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                                Quick Book
                            </Button>
                        </div>
                    </>
                )}

                {/* Call Log Modal */}
                {showCallLogModal && lead && (
                    <CallLogModal
                        leadId={lead.id}
                        leadName={`${lead.firstName} ${lead.lastName} `}
                        onClose={() => setShowCallLogModal(false)}
                        onSuccess={() => setActiveTab('history')}
                    />
                )}

            </div>
            {/* Intelligent Schedule Modal */}
            {showScheduleModal && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in cursor-default" onClick={(e) => e.stopPropagation()}>
                    <div className="w-full max-w-lg p-6 bg-white shadow-xl rounded-3xl animate-in zoom-in-95 border border-slate-100" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-3 uppercase italic">
                            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg"><Calendar size={20} /></div>
                            Planifier un Rendez-vous
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mb-6">
                            Assigner un créneau pour <strong>{lead.firstName} {lead.lastName}</strong>.
                        </p>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Date</label>
                                <input
                                    type="date"
                                    className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Heure</label>
                                    <input
                                        type="time"
                                        className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        value={scheduleTime}
                                        onChange={(e) => setScheduleTime(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Type</label>
                                    <select
                                        className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        defaultValue="MEETING"
                                    >
                                        <option value="MEETING">📍 Agence</option>
                                        <option value="CALL">📞 Téléphone</option>
                                        <option value="VISIO">💻 Visio</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-indigo-600 shadow-sm">
                                        {lead.assignedUserId ? '👤' : '?'}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Commercial Assigné</p>
                                        <p className="text-sm font-bold text-slate-900">
                                            {lead.assignedUserId ? (salesReps.find(u => u.id === lead.assignedUserId)?.name || 'Commercial Assigné') : 'Non assigné'}
                                        </p>
                                    </div>
                                </div>
                                {lead.agencyId && (
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-2 pl-11">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                        Agence liée au lead
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end mt-8">
                            <Button variant="ghost" onClick={() => setShowScheduleModal(false)} className="font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl">Annuler</Button>
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl shadow-lg shadow-indigo-200"
                                onClick={async () => {
                                    if (!scheduleDate || !scheduleTime) return;

                                    const start = new Date(`${scheduleDate}T${scheduleTime} `);
                                    const end = new Date(start);
                                    end.setMinutes(end.getMinutes() + 45);

                                    const res = await createAppointmentAction({
                                        organisationId: lead.organizationId,
                                        agencyId: lead.agencyId,
                                        leadId: lead.id,
                                        userId: lead.assignedUserId || 'unknown', // Fallback needed
                                        title: `RDV Lead - ${lead.firstName} ${lead.lastName} `,
                                        type: 'MEETING',
                                        start,
                                        end
                                    });

                                    if (res.success) {
                                        // Also update lead interaction
                                        const updated = await LeadService.registerInteraction(lead, 'current-user-id', CallOutcome.CALLBACK_SCHEDULED, {
                                            nextCallback: start,
                                            note: 'Rendez-vous planifié via Agenda'
                                        });
                                        onUpdate(updated);
                                        setShowScheduleModal(false);
                                        alert("✅ Rendez-vous confirmé et ajouté à l'agenda !");
                                    } else {
                                        alert(res.error);
                                    }
                                }}
                            >
                                <Calendar size={18} className="mr-2" />
                                Confirmer le RDV
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Communication Modal (Replaces old WhatsApp Modal) */}
            {isWhatsAppOpen && lead && (
                <CommunicationModal
                    leadIds={[lead.id]}
                    onClose={() => setIsWhatsAppOpen(false)}
                    onSuccess={() => {
                        setIsWhatsAppOpen(false);
                        onUpdate(lead); // Refresh lead just in case
                    }}
                    title={`Relancer ${lead.firstName} `}
                />
            )}

        </div >,
        document.body
    );
}
