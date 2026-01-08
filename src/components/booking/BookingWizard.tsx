'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, ChevronLeft, Clock, Calendar as CalendarIcon, CheckCircle2, Loader2, User, Mail, Phone, Globe } from 'lucide-react';
import { format, isSameDay, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getPublicProfileAndAvailabilityAction, createPublicBookingAction } from '@/application/actions/agenda.actions';

interface BookingWizardProps {
    userId: string;
}

export function BookingWizard({ userId }: BookingWizardProps) {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [slots, setSlots] = useState<string[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    // User Profile
    const [profile, setProfile] = useState<{ firstName: string; lastName: string } | null>(null);

    // Form Data
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (date && userId) {
            loadSlots(date);
        }
    }, [date, userId]);

    const loadSlots = async (selectedDate: Date) => {
        setIsLoadingSlots(true);
        setSelectedSlot(null);
        const res = await getPublicProfileAndAvailabilityAction(userId, selectedDate);
        if (res.success && res.data) {
            setSlots(res.data.slots);
            setProfile(res.data.user);
        }
        setIsLoadingSlots(false);
    };

    const handleSlotSelect = (slot: string) => {
        setSelectedSlot(slot);
        setStep(3);
    };

    const handleSubmit = async () => {
        if (!date || !selectedSlot) return;

        setIsSubmitting(true);

        // Parse start/end
        const [hours, minutes] = selectedSlot.split(':').map(Number);
        const start = new Date(date);
        start.setHours(hours, minutes, 0, 0);

        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 30); // Default 30 min

        // We use a special server action or the existing one depending on auth. 
        // Existing createAppointmentAction checks collisions but might expect authenticated user?
        // Actually event creation usually requires an internalUserId. 
        // The lead is external. We need logic to handle "Lead" creation or finding.
        // For now, let's assume we create a lead or just a raw event with metadata.
        // Wait, createAppointmentAction takes `userId`. That is the INTERNAL user (the host).
        // It takes `leadId`. We don't have a lead ID yet.
        // We really need a public action that creates the lead if not exists.
        // BUT for MVP, I will call a new wrapper or modify createAppointmentAction?
        // Let's create `createPublicAppointmentAction` in `agenda.actions` next. 
        // For now I will mock the call or assume I'll add `createPublicAppointmentAction`

        // I will use `createAppointmentAction` but I need to handle the fact I am not logged in.
        // Actually `createAppointmentAction` is a server action. It doesn't check `auth()` inside it (checks args).
        // But it requires `leadId`. 
        // Use `description` to store lead info for now if we don't want to complexity of creating Leads yet?
        // Better: Create a `createPublicBookingAction` in `agenda.actions.ts`.

        // WRITING VALID CODE assuming `createPublicBookingAction` will be created.
        const res = await createPublicBookingAction({
            hostUserId: userId,
            start,
            end,
            lead: formData
        });

        setIsSubmitting(false);

        if (res.success) {
            setStep(4);
        } else {
            alert("Erreur lors de la réservation: " + res.error);
        }
    };

    if (!profile && !isLoadingSlots) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[600px] flex flex-col md:flex-row">
            {/* Sidebar / Info Panel */}
            <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-100 p-8 flex flex-col">
                {profile && (
                    <div className="mb-8">
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-2xl mb-4">
                            {profile.firstName[0]}{profile.lastName[0]}
                        </div>
                        <h2 className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-1">Organisateur</h2>
                        <h1 className="text-2xl font-black text-slate-900">{profile.firstName} {profile.lastName}</h1>
                    </div>
                )}

                <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3 text-slate-600">
                        <Clock className="text-indigo-500" size={20} />
                        <div>
                            <p className="font-bold text-slate-900">30 min</p>
                            <p className="text-xs text-slate-500">Durée du rendez-vous</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                        <Globe className="text-indigo-500" size={20} />
                        <div>
                            <p className="font-bold text-slate-900">Visio / Appel</p>
                            <p className="text-xs text-slate-500">Mode de réunion</p>
                        </div>
                    </div>
                </div>

                {date && selectedSlot && (
                    <div className="mt-8 bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                        <p className="text-xs font-bold text-indigo-400 uppercase mb-1">Créneau sélectionné</p>
                        <p className="text-indigo-900 font-bold flex items-center gap-2">
                            <CalendarIcon size={14} />
                            {format(date, 'EEEE d MMMM', { locale: fr })}
                        </p>
                        <p className="text-indigo-700 font-black text-xl mt-1">
                            {selectedSlot}
                        </p>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 relative">

                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-bold mb-6 text-slate-900">Choisis une date</h2>
                        <div className="flex justify-center flex-col items-center gap-4">
                            {/* Native Date Input Replacement */}
                            <p className="text-sm text-slate-500">Sélectionnez le jour de votre rendez-vous :</p>
                            <input
                                type="date"
                                value={date ? format(date, 'yyyy-MM-dd') : ''}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setDate(new Date(e.target.value));
                                        setStep(2);
                                    }
                                }}
                                className="border border-slate-200 rounded-xl px-4 py-3 text-lg font-bold w-full max-w-sm"
                                min={format(new Date(), 'yyyy-MM-dd')}
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                        <button onClick={() => setStep(1)} className="text-xs font-bold text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1">
                            <ChevronLeft size={12} /> Retour au calendrier
                        </button>
                        <h2 className="text-xl font-bold mb-6 text-slate-900 flex items-center gap-2">
                            Disponibilités pour le <span className="text-indigo-600">{date && format(date, 'd MMMM', { locale: fr })}</span>
                        </h2>

                        {isLoadingSlots ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 className="animate-spin text-indigo-600" size={32} />
                            </div>
                        ) : slots.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                <p>Aucun créneau disponible ce jour-là.</p>
                                <Button variant="link" onClick={() => setStep(1)}>Choisir une autre date</Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[400px] pr-2">
                                {slots.map(slot => (
                                    <button
                                        key={slot}
                                        onClick={() => handleSlotSelect(slot)}
                                        className="py-3 px-4 rounded-xl border border-indigo-100 text-indigo-600 font-bold hover:bg-indigo-600 hover:text-white hover:scale-105 transition-all shadow-sm"
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <button onClick={() => setStep(2)} className="text-xs font-bold text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1">
                            <ChevronLeft size={12} /> Retour aux créneaux
                        </button>
                        <h2 className="text-xl font-bold mb-6 text-slate-900">Tes coordonnées</h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Prénom</label>
                                    <Input value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="rounded-xl" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Nom</label>
                                    <Input value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="rounded-xl" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                                <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="rounded-xl" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Téléphone (Optionnel)</label>
                                <Input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="rounded-xl" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Notes / Sujet</label>
                                <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="rounded-xl" rows={3} />
                            </div>

                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !formData.firstName || !formData.lastName || !formData.email}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 rounded-2xl mt-4"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirmer le Rendez-vous'}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-300 text-center p-8">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 shadow-lg shadow-green-100">
                            <CheckCircle2 size={40} strokeWidth={3} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Réservation Confirmée !</h2>
                        <p className="text-slate-500 mb-8 max-w-sm">
                            Un email de confirmation vient de t'être envoyé à <span className="font-bold text-slate-700">{formData.email}</span>.
                        </p>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 w-full mb-6">
                            <p className="font-bold text-slate-900 text-lg mb-1">{format(date!, 'EEEE d MMMM yyyy', { locale: fr })}</p>
                            <p className="text-indigo-600 font-bold text-2xl">{selectedSlot}</p>
                        </div>
                        <Button variant="outline" onClick={() => window.location.reload()}>Faire une autre réservation</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
