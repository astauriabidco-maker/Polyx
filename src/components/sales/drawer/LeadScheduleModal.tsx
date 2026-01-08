import { useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadWithOrg, LeadStatus } from '@/domain/entities/lead';
import { confirmLeadAppointmentAction, createAppointmentAction } from '@/application/actions/agenda.actions';

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
    const [scheduleUserId, setScheduleUserId] = useState(lead.assignedUserId || '');
    const [isQuickBooking, setIsQuickBooking] = useState(false);

    const handleConfirm = async () => {
        if (!scheduleDate || !scheduleTime || !scheduleUserId) {
            alert("Veuillez remplir tous les champs.");
            return;
        }

        setIsQuickBooking(true);
        const start = new Date(`${scheduleDate}T${scheduleTime}`);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 45);

        let res;
        if (scheduleType === 'MEETING') {
            res = await confirmLeadAppointmentAction({
                organisationId: lead.organizationId,
                leadId: lead.id,
                agencyId: lead.agencyId!,
                userId: scheduleUserId,
                start,
                end,
                title: `RDV Agence - ${lead.firstName} ${lead.lastName}`,
                callerId: callerId
            });
        } else {
            res = await createAppointmentAction({
                organisationId: lead.organizationId,
                agencyId: lead.agencyId,
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
            alert(scheduleType === 'MEETING' ? '✅ RDV Agence Fixé ! Le lead a été déplacé en CRM.' : '✅ Rendez-vous planifié !');
            onUpdate({
                status: scheduleType === 'MEETING' ? LeadStatus.RDV_FIXE : lead.status,
                nextCallbackAt: start
            });
            onClose();
        } else {
            alert(res.error);
        }
    };

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
                                value={scheduleType}
                                onChange={(e) => setScheduleType(e.target.value)}
                            >
                                <option value="MEETING">📍 Agence</option>
                                <option value="CALL">📞 Téléphone</option>
                                <option value="VISIO">💻 Visio</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1 mt-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Commercial / Interlocuteur</label>
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
