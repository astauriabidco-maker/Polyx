'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadWithOrg, LeadStatus } from '@/domain/entities/lead';
import { confirmLeadAppointmentAction, createAppointmentAction } from '@/application/actions/agenda.actions';
import { getAgenciesAction } from '@/application/actions/agency.actions';
import { addDays, format } from 'date-fns';

interface LeadScheduleModalProps {
    lead: LeadWithOrg;
    callerId: string;
    salesReps: { id: string, name: string }[];
    onClose: () => void;
    onUpdate: (data: { status: LeadStatus, nextCallbackAt: Date }) => void;
}

export function LeadScheduleModal({ lead, callerId, salesReps, onClose, onUpdate }: LeadScheduleModalProps) {
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [scheduleType, setScheduleType] = useState('MEETING');
    // Default to assigned user, fallback to current caller (you), fallback to empty
    const [scheduleUserId, setScheduleUserId] = useState(lead.assignedUserId || callerId || '');
    const [scheduleAgencyId, setScheduleAgencyId] = useState(lead.agencyId || '');
    const [agencies, setAgencies] = useState<{ id: string, name: string }[]>([]);
    const [isQuickBooking, setIsQuickBooking] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Load Agencies
    useEffect(() => {
        console.log("LeadScheduleModal: MOUNTED");
        const loadAgencies = async () => {
            if (lead.organizationId) {
                const res = await getAgenciesAction(lead.organizationId);
                if (res.success && res.agencies) {
                    setAgencies(res.agencies);
                    // Auto-select first agency if none selected
                    // We check both local state and prop to be sure
                    if (!scheduleAgencyId && !lead.agencyId && res.agencies.length > 0) {
                        setScheduleAgencyId(res.agencies[0].id);
                    }
                }
            }
        };
        loadAgencies();
    }, [lead.organizationId, lead.agencyId]);

    const handleConfirm = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (!scheduleDate || !scheduleTime || !scheduleUserId) {
            alert("Veuillez remplir tous les champs (Date, Heure, Commercial).");
            return;
        }

        // Only enforce agency selection if agencies are available
        if (scheduleType === 'MEETING' && !scheduleAgencyId && agencies.length > 0) {
            alert("Veuillez sélectionner une agence pour le rendez-vous physique.");
            return;
        }

        setIsQuickBooking(true);
        const start = new Date(`${scheduleDate}T${scheduleTime}`);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 45);

        console.log("Confirming with:", {
            organisationId: lead.organizationId,
            leadId: lead.id,
            agencyId: scheduleAgencyId,
            userId: scheduleUserId,
            start,
            scheduleType
        });

        let res;
        try {
            if (scheduleType === 'MEETING') {
                res = await confirmLeadAppointmentAction({
                    organisationId: lead.organizationId,
                    leadId: lead.id,
                    agencyId: scheduleAgencyId || undefined,
                    userId: scheduleUserId,
                    start,
                    end,
                    title: `RDV Agence - ${lead.firstName} ${lead.lastName}`,
                    callerId: callerId,
                    shouldRevalidate: false // Prevent flash by deferring revalidation
                });
            } else {
                res = await createAppointmentAction({
                    organisationId: lead.organizationId,
                    agencyId: scheduleAgencyId || undefined,
                    leadId: lead.id,
                    userId: scheduleUserId,
                    title: `RDV ${scheduleType} - ${lead.firstName} ${lead.lastName}`,
                    type: scheduleType,
                    start,
                    end
                });
            }

            setIsQuickBooking(false);

            if (res.success) {
                // Success! Show success state instead of closing immediately
                setIsSuccess(true);
            } else {
                alert((res as any).error || "Erreur inconnue");
            }
        } catch (err) {
            console.error(err);
            setIsQuickBooking(false);
            alert("Une erreur inattendue est survenue.");
        }
    };

    // Date Shortcuts
    const setDateShortcut = (daysToAdd: number) => {
        const date = addDays(new Date(), daysToAdd);
        setScheduleDate(format(date, 'yyyy-MM-dd'));
    };

    const router = useRouter();

    const handleFinish = () => {
        // Trigger updates and close
        const start = new Date(`${scheduleDate}T${scheduleTime}`);
        onUpdate({
            status: scheduleType === 'MEETING' ? LeadStatus.RDV_FIXE : lead.status,
            nextCallbackAt: start
        });

        // Now trigger the refresh manually
        router.refresh();
        onClose();
    };

    if (isSuccess) {
        return (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in cursor-default" onClick={(e) => e.stopPropagation()}>
                <div className="w-full max-w-sm p-8 bg-white shadow-xl rounded-3xl animate-in zoom-in-95 border border-green-100 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle size={32} strokeWidth={3} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">
                        {scheduleType === 'MEETING' ? 'RDV Confirmé !' : 'Planifié !'}
                    </h3>
                    <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                        {scheduleType === 'MEETING'
                            ? "Le dossier Apprenant a été créé et le lead a été basculé en CRM."
                            : "L'action a bien été enregistrée dans l'historique."}
                    </p>
                    <Button
                        onClick={handleFinish}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                        Terminer & Suivant
                    </Button>
                </div>
            </div>
        );
    }

    return (
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
                    {/* TYPE & AGENCE ROW */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Type</label>
                            <select
                                className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={scheduleType}
                                onChange={(e) => setScheduleType(e.target.value)}
                            >
                                <option value="MEETING">📍 Agence</option>
                                <option value="CALL">📞 Téléphone</option>
                                <option value="VISIO">💻 Visio</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Agence</label>
                            <select
                                className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={scheduleAgencyId}
                                onChange={(e) => setScheduleAgencyId(e.target.value)}
                                disabled={scheduleType !== 'MEETING' && !scheduleAgencyId}
                            >
                                <option value="" disabled>Choisir une agence</option>
                                {agencies.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* DATE & SHORTCUTS */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Date</label>
                            <div className="flex gap-2">
                                <button onClick={() => setDateShortcut(1)} className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md transition-colors">Demain</button>
                                <button onClick={() => setDateShortcut(2)} className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md transition-colors">+2j</button>
                                <button onClick={() => setDateShortcut(7)} className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md transition-colors">+7j</button>
                            </div>
                        </div>
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
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Commercial / Host</label>
                            <select
                                className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={scheduleUserId}
                                onChange={(e) => setScheduleUserId(e.target.value)}
                            >
                                <option value="" disabled>Choisir un commercial</option>
                                {salesReps.map(rep => (
                                    <option key={rep.id} value={rep.id}>{rep.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 justify-end mt-8">
                    <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl">Annuler</Button>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl shadow-lg shadow-indigo-200"
                        disabled={isQuickBooking}
                        onClick={handleConfirm}
                    >
                        {isQuickBooking ? <Loader2 size={18} className="animate-spin mr-2" /> : <Calendar size={18} className="mr-2" />}
                        Confirmer le RDV
                    </Button>
                </div>
            </div>
        </div>
    );
}
