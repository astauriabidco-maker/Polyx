import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, MapPin, Edit2, Trash2, Bell, Save, Loader2, CheckSquare, Phone, Mail, ExternalLink, Copy, Repeat, Link as LinkIcon, Info, Flame, Target, BookOpen, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CallCockpit } from '@/components/sales/call-cockpit';
import { CallOutcome } from '@/domain/entities/lead';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { updateAppointmentAction, deleteAppointmentAction, scheduleReminderAction, completeAppointmentAction, duplicateAppointmentAction } from '@/application/actions/agenda.actions';
import { logActivityAction } from '@/application/actions/lead.actions';
import { getTrainingsAction } from '@/application/actions/training.actions';
import { useAuthStore } from '@/application/store/auth-store';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

interface EventDetailModalProps {
    event: {
        id: string;
        title: string;
        description?: string;
        start: Date;
        end: Date;
        type?: string;
        status?: string;
        meetingLink?: string;
        internalNotes?: string;
        trainingId?: string;
        user?: { firstName: string; lastName: string };
        lead?: { id: string; firstName: string; lastName: string; phone?: string; email?: string; source?: string; score?: number };
        agency?: { name: string };
        training?: { title: string };
    };
    onClose: () => void;
    onUpdate: () => void;
}

export function EventDetailModal({ event, onClose, onUpdate }: EventDetailModalProps) {
    const { user: activeUser, activeOrganization } = useAuthStore();
    const { toast } = useToast();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCallActive, setIsCallActive] = useState(false);

    const [title, setTitle] = useState(event.title);
    const [description, setDescription] = useState(event.description || '');
    const [startDate, setStartDate] = useState(format(new Date(event.start), "yyyy-MM-dd'T'HH:mm"));
    const [endDate, setEndDate] = useState(format(new Date(event.end), "yyyy-MM-dd'T'HH:mm"));
    const [meetingLink, setMeetingLink] = useState(event.meetingLink || '');
    const [internalNotes, setInternalNotes] = useState(event.internalNotes || '');
    const [trainingId, setTrainingId] = useState(event.trainingId || '');
    const [trainings, setTrainings] = useState<any[]>([]);
    const [isLoadingTrainings, setIsLoadingTrainings] = useState(false);

    useEffect(() => {
        if (isEditing && activeOrganization?.id) {
            loadTrainings();
        }
    }, [isEditing]);

    const loadTrainings = async () => {
        setIsLoadingTrainings(true);
        const res = await getTrainingsAction(activeOrganization!.id);
        setIsLoadingTrainings(false);
        if (res.success) setTrainings(res.trainings || []);
    };

    const [reminderChannel, setReminderChannel] = useState<'sms' | 'email'>('sms');
    const [reminderHours, setReminderHours] = useState(24);
    const [isSchedulingReminder, setIsSchedulingReminder] = useState(false);

    // Debrief State
    const [isDebriefing, setIsDebriefing] = useState(false);
    const [debriefOutcome, setDebriefOutcome] = useState<'POSITIVE' | 'NEGATIVE' | 'RESCHEDULE' | 'NO_SHOW'>('POSITIVE');
    const [debriefSummary, setDebriefSummary] = useState('');
    const [isCompleting, setIsCompleting] = useState(false);

    const isPast = new Date(event.end) < new Date();
    const needsDebrief = isPast && event.status !== 'COMPLETED' && event.status !== 'CANCELLED';

    const handleComplete = async () => {
        setIsCompleting(true);
        const res = await completeAppointmentAction(event.id, {
            summary: debriefSummary,
            outcome: debriefOutcome
        });
        setIsCompleting(false);
        if (res.success) {
            setIsDebriefing(false);
            onUpdate();
        } else {
            alert(res.error);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        const res = await updateAppointmentAction(event.id, {
            title,
            description,
            start: new Date(startDate),
            end: new Date(endDate),
            meetingLink,
            internalNotes,
            trainingId: trainingId || undefined
        });
        setIsSaving(false);
        if (res.success) {
            setIsEditing(false);
            onUpdate();
        } else {
            alert(res.error);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous ?')) return;
        setIsDeleting(true);
        const res = await deleteAppointmentAction(event.id);
        setIsDeleting(false);
        if (res.success) {
            onClose();
            onUpdate();
        } else {
            alert(res.error);
        }
    };

    const handleScheduleReminder = async () => {
        setIsSchedulingReminder(true);
        const res = await scheduleReminderAction(event.id, reminderChannel, reminderHours);
        setIsSchedulingReminder(false);
        if (res.success) {
            alert('✅ Rappel programmé !');
        } else {
            alert(res.error);
        }
    };

    // --- QUICK ACTIONS ---
    const handleCall = () => {
        if (event.lead?.id && event.lead?.phone) {
            setIsCallActive(true);
        }
        else alert('Aucun numéro de téléphone disponible');
    };

    const handleWhatsAppCall = () => {
        if (event.lead?.id && event.lead?.phone) {
            const cleanPhone = event.lead.phone.replace(/\D/g, '');
            window.open(`https://wa.me/${cleanPhone}`, '_blank');
            logActivityAction({
                leadId: event.lead.id,
                userId: activeUser?.id || 'SYSTEM',
                type: 'CONTACT_ATTEMPT',
                content: 'Appel WhatsApp initié depuis l\'agenda',
                metadata: { channel: 'WHATSAPP_CALL' }
            });
        }
        else alert('Aucun numéro de téléphone disponible');
    };


    const handleEmail = () => {
        if (event.lead?.id && event.lead?.email) {
            window.location.href = `mailto:${event.lead.email}`;
            logActivityAction({
                leadId: event.lead.id,
                userId: activeUser?.id || 'SYSTEM',
                type: 'CONTACT_ATTEMPT',
                content: 'Tentative d\'email depuis l\'agenda',
                metadata: { channel: 'EMAIL' }
            });
        }
        else alert('Aucun email disponible');
    };


    const handleOpenCRM = () => {
        if (event.lead?.id) window.open(`/app/crm?leadId=${event.lead.id}`, '_blank');
        else alert('Aucun dossier client lié');
    };

    const handleCopyLink = () => {
        // Try to find a link in metadata or description
        const metadata = (event as any).metadata || {};
        const meetLink = metadata.meetingLink || metadata.visiosLink;

        let linkToCopy = meetLink;

        if (!linkToCopy && event.description) {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const matches = event.description.match(urlRegex);
            if (matches && matches.length > 0) linkToCopy = matches[0];
        }

        if (linkToCopy) {
            navigator.clipboard.writeText(linkToCopy);
            alert('Lien de réunion copié !');
        } else {
            alert('Aucun lien de réunion trouvé dans cet événement.');
        }
    };

    const handleDuplicate = async () => {
        if (!confirm('Voulez-vous dupliquer ce rendez-vous ?')) return;
        setIsSaving(true);
        const res = await duplicateAppointmentAction(event.id);
        setIsSaving(false);
        if (res.success) {
            alert('✅ Rendez-vous dupliqué !');
            onUpdate();
        } else {
            alert(res.error);
        }
    };

    const statusColors: Record<string, string> = {
        SCHEDULED: 'bg-blue-100 text-blue-700',
        CONFIRMED: 'bg-green-100 text-green-700',
        CANCELLED: 'bg-red-100 text-red-700',
        COMPLETED: 'bg-slate-100 text-slate-700'
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                {isCallActive && event.lead && (
                    <div className="absolute inset-0 z-[110] bg-white rounded-2xl overflow-hidden animate-in slide-in-from-right duration-300">
                        <div className="h-full">
                            <CallCockpit
                                lead={event.lead as any}
                                onEndCall={(outcome) => {
                                    setIsCallActive(false);
                                    if (outcome === CallOutcome.APPOINTMENT_SET) onUpdate();
                                }}
                                recordingEnabled={true}
                            />
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="bg-white/20 border border-white/30 rounded-lg px-3 py-1 text-white placeholder:text-white/50 w-full text-lg font-bold"
                                />
                            ) : (
                                <h2 className="text-xl font-bold">{event.title}</h2>
                            )}
                            <p className="text-indigo-200 text-sm mt-1">
                                {format(new Date(event.start), 'EEEE d MMMM yyyy', { locale: fr })}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Quick Action Bar (Inserted in Header) */}
                    {!isEditing && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/20">
                            <QuickAction icon={<Phone size={16} />} label="Appeler" onClick={handleCall} disabled={!event.lead?.phone} />
                            <QuickAction
                                icon={<Phone size={16} className="text-[#25D366]" />}
                                label="WA Call"
                                onClick={handleWhatsAppCall}
                                disabled={!event.lead?.phone}
                            />
                            <QuickAction icon={<Mail size={16} />} label="Email" onClick={handleEmail} disabled={!event.lead?.email} />
                            <QuickAction icon={<ExternalLink size={16} />} label="CRM" onClick={handleOpenCRM} disabled={!event.lead?.id} />

                            {event.type === 'VISIO' && (
                                <QuickAction icon={<LinkIcon size={16} />} label="Lien" onClick={handleCopyLink} />
                            )}
                            <QuickAction icon={<Repeat size={16} />} label="Dupliquer" onClick={handleDuplicate} />
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Status Badge */}
                    {event.status && (
                        <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${statusColors[event.status] || 'bg-slate-100 text-slate-600'}`}>
                            {event.status}
                        </span>
                    )}

                    {/* Time */}
                    <div className="flex items-center gap-3 text-slate-600">
                        <Clock size={18} className="text-indigo-500" />
                        {isEditing ? (
                            <div className="flex gap-2 flex-1">
                                <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 border rounded-lg px-2 py-1 text-sm" />
                                <span>→</span>
                                <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 border rounded-lg px-2 py-1 text-sm" />
                            </div>
                        ) : (
                            <span>{format(new Date(event.start), 'HH:mm')} - {format(new Date(event.end), 'HH:mm')}</span>
                        )}
                    </div>

                    {/* Collaborator */}
                    {event.user && (
                        <div className="flex items-center gap-3 text-slate-600">
                            <User size={18} className="text-indigo-500" />
                            <span>{event.user.firstName} {event.user.lastName}</span>
                        </div>
                    )}

                    {/* Lead */}
                    {event.lead && (
                        <div className="flex items-center gap-3 text-slate-600">
                            <Calendar size={18} className="text-indigo-500" />
                            <span>Client : {event.lead.firstName} {event.lead.lastName}</span>
                        </div>
                    )}

                    {/* Agency */}
                    {event.agency && (
                        <div className="flex items-center gap-3 text-slate-600">
                            <MapPin size={18} className="text-indigo-500" />
                            <span>{event.agency.name}</span>
                        </div>
                    )}

                    {/* Formation recherchée */}
                    <div className="flex items-center gap-3 text-slate-600">
                        <BookOpen size={18} className="text-indigo-500" />
                        {isEditing ? (
                            <select
                                value={trainingId}
                                onChange={(e) => setTrainingId(e.target.value)}
                                className="flex-1 border rounded-lg px-2 py-1 text-sm bg-white"
                                disabled={isLoadingTrainings}
                            >
                                <option value="">-- Sélectionner une formation --</option>
                                {trainings.map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                        ) : (
                            <span className="font-medium text-slate-800">
                                Formation : {event.training?.title || 'Non spécifiée'}
                            </span>
                        )}
                    </div>

                    {/* Visio Link */}
                    <div className="flex items-center gap-3 text-slate-600">
                        <LinkIcon size={18} className="text-indigo-500" />
                        {isEditing ? (
                            <input
                                type="text"
                                value={meetingLink}
                                onChange={(e) => setMeetingLink(e.target.value)}
                                placeholder="Lien visio (URL)"
                                className="flex-1 border rounded-lg px-2 py-1 text-sm"
                            />
                        ) : (
                            <div className="flex items-center gap-2 overflow-hidden">
                                <span className="truncate max-w-[200px] text-indigo-600 hover:underline cursor-pointer" onClick={() => meetingLink && window.open(meetingLink, '_blank')}>
                                    {meetingLink || 'Pas de lien visio'}
                                </span>
                                {meetingLink && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigator.clipboard.writeText(meetingLink)}>
                                        <Copy size={12} />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="mt-4">
                        <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                        {isEditing ? (
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full border rounded-lg p-2 mt-1 text-sm"
                                rows={2}
                            />
                        ) : (
                            <p className="text-slate-600 text-sm mt-1 whitespace-pre-line">{event.description || 'Aucune description.'}</p>
                        )}
                    </div>

                    {/* Internal Notes */}
                    <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Notes Internes (Privé)</label>
                        {isEditing ? (
                            <textarea
                                value={internalNotes}
                                onChange={(e) => setInternalNotes(e.target.value)}
                                className="w-full border rounded-lg p-2 mt-1 text-sm bg-white"
                                rows={2}
                                placeholder="Notes pour la préparation..."
                            />
                        ) : (
                            <p className="text-slate-600 text-sm mt-1 italic">{internalNotes || 'Aucune note interne.'}</p>
                        )}
                    </div>

                    {/* Lead Context Card */}
                    {event.lead && (
                        <div className="mt-4 bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex flex-col gap-2">
                            <label className="text-[10px] font-black text-indigo-400 uppercase">Contexte Prospect</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                    <Target size={14} className="text-indigo-500" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 uppercase leading-none">Source</span>
                                        <span className="text-xs font-bold text-slate-700">{event.lead.source || 'Inconnue'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Flame size={14} className={event.lead.score && event.lead.score > 70 ? "text-orange-500" : "text-indigo-400"} />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 uppercase leading-none">Température</span>
                                        <span className="text-xs font-bold text-slate-700">{event.lead.score || 50}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reminder Section */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Bell size={16} className="text-amber-600" />
                            <span className="text-sm font-bold text-amber-700">Programmer un rappel</span>
                        </div>
                        <div className="flex gap-2 items-center">
                            <select value={reminderChannel} onChange={(e) => setReminderChannel(e.target.value as 'sms' | 'email')} className="border rounded-lg px-2 py-1 text-sm bg-white">
                                <option value="sms">SMS</option>
                                <option value="email">Email</option>
                            </select>
                            <select value={reminderHours} onChange={(e) => setReminderHours(Number(e.target.value))} className="border rounded-lg px-2 py-1 text-sm bg-white">
                                <option value={1}>1h avant</option>
                                <option value={24}>24h avant</option>
                                <option value={48}>48h avant</option>
                            </select>
                            <Button size="sm" onClick={handleScheduleReminder} disabled={isSchedulingReminder} className="bg-amber-500 hover:bg-amber-600 text-white">
                                {isSchedulingReminder ? <Loader2 size={14} className="animate-spin" /> : 'Activer'}
                            </Button>
                        </div>
                    </div>

                    {/* Debrief Section */}
                    {(needsDebrief || isDebriefing) && (
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 mt-4 animate-in fade-in slide-in-from-bottom-2">
                            {!isDebriefing ? (
                                <Button onClick={() => setIsDebriefing(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 rounded-xl shadow-md border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 transition-all">
                                    <CheckSquare className="mr-3" />
                                    Faire le Compte-rendu
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckSquare className="text-indigo-600" />
                                        <h3 className="font-black text-indigo-900 border-b-2 border-indigo-100 pb-1 w-full">Compte-rendu</h3>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Résultat</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { val: 'POSITIVE', label: '✅ Positif', color: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' },
                                                { val: 'NEGATIVE', label: '❌ Négatif', color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' },
                                                { val: 'RESCHEDULE', label: '📅 À Replanifier', color: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' },
                                                { val: 'NO_SHOW', label: '🚫 Absent (No Show)', color: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.val}
                                                    onClick={() => setDebriefOutcome(opt.val as any)}
                                                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${debriefOutcome === opt.val ? 'ring-2 ring-indigo-500 ' + opt.color : 'opacity-70 grayscale hover:grayscale-0 hover:opacity-100 bg-white'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Résumé / Notes</label>
                                        <textarea
                                            value={debriefSummary}
                                            onChange={(e) => setDebriefSummary(e.target.value)}
                                            className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                                            placeholder="Qu'est-ce qui s'est dit ? Prochaines étapes..."
                                        />
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <Button variant="ghost" size="sm" onClick={() => setIsDebriefing(false)} className="flex-1 text-slate-400">Annuler</Button>
                                        <Button size="sm" onClick={handleComplete} disabled={isCompleting || !debriefSummary} className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-bold">
                                            {isCompleting ? <Loader2 className="animate-spin" /> : 'Valider'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t bg-slate-50 flex justify-between">
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Trash2 size={16} className="mr-2" />}
                        Supprimer
                    </Button>
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <Button variant="ghost" onClick={() => setIsEditing(false)}>Annuler</Button>
                                <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500">
                                    {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                                    Enregistrer
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => setIsEditing(true)} className="bg-indigo-600 hover:bg-indigo-500">
                                <Edit2 size={16} className="mr-2" /> Modifier
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function QuickAction({ icon, label, onClick, disabled }: { icon: React.ReactNode, label: string, onClick: () => void, disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[60px] ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20 cursor-pointer'}`}
        >
            <div className="p-2 bg-white/10 rounded-full">
                {icon}
            </div>
            <span className="text-[10px] font-medium text-white/90">{label}</span>
        </button>
    );
}
