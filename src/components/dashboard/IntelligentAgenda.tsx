'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    User as UserIcon,
    Sparkles,
    Loader2,
    List,
    Grid3X3,
    BarChart3,
    Filter
} from 'lucide-react';
import {
    format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay,
    startOfMonth, endOfMonth, addMonths, subMonths, getDay, isSameMonth,
    setHours, setMinutes
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { getAgendaEventsAction, getAgencyCollaboratorsAction, createAppointmentAction, linkGoogleCalendarAction } from '@/application/actions/agenda.actions';
import { useAuthStore } from '@/application/store/auth-store';

export default function IntelligentAgenda({ orgId, agencyId }: { orgId: string, agencyId: string }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
    const [collaborators, setCollaborators] = useState<any[]>([]);

    // Filters
    const [selectedAgencyFilter, setSelectedAgencyFilter] = useState<string>('ALL');
    const [selectedUserFilter, setSelectedUserFilter] = useState<string>('ALL');

    // Booking Form State
    const [bookingType, setBookingType] = useState('MEETING');
    const [bookingTitle, setBookingTitle] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [bookingTime, setBookingTime] = useState('10:00');
    const [bookingDuration, setBookingDuration] = useState('45');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            const agencyFilter = selectedAgencyFilter === 'ALL' ? undefined : selectedAgencyFilter;
            const userFilter = selectedUserFilter === 'ALL' ? undefined : selectedUserFilter;

            // If agencyId prop is provided (e.g. user is restricted), use it. 
            // Otherwise use the filter value if set. If neither, fetch all.
            const effectiveAgencyId = agencyId || agencyFilter;

            const [eventsRes, colabsRes] = await Promise.all([
                getAgendaEventsAction(orgId, effectiveAgencyId, userFilter),
                getAgencyCollaboratorsAction(effectiveAgencyId || '') // Fetch collaborators for filter context
            ]);

            if (eventsRes.success) setEvents(eventsRes.data || []);
            if (colabsRes.success) setCollaborators(colabsRes.data || []);
            setIsLoading(false);
        }
        load();
    }, [orgId, agencyId, selectedAgencyFilter, selectedUserFilter, currentDate]); // Reload when filters change

    // --- VIEW CALCULATIONS ---
    const weekDays = eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 })
    });

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthDays = eachDayOfInterval({
        start: startOfWeek(monthStart, { weekStartsOn: 1 }),
        end: endOfWeek(monthEnd, { weekStartsOn: 1 })
    });

    // --- NAVIGATION ---
    const handlePrev = () => {
        if (viewMode === 'week') setCurrentDate(addDays(currentDate, -7));
        else setCurrentDate(subMonths(currentDate, 1));
    };
    const handleNext = () => {
        if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
        else setCurrentDate(addMonths(currentDate, 1));
    };

    // --- BOOKING ---
    const handleOpenBooking = (day: Date) => {
        setSelectedSlot(day);
        setIsBookingOpen(true);
    };

    const handleCreateBooking = async () => {
        if (!selectedSlot || !selectedUserId || !bookingTitle) return;

        setIsSubmitting(true);
        const [hours, minutes] = bookingTime.split(':').map(Number);
        const start = setMinutes(setHours(selectedSlot, hours), minutes);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + parseInt(bookingDuration));

        const res = await createAppointmentAction({
            organisationId: orgId,
            agencyId: agencyId || '', // Fallback needed?
            userId: selectedUserId,
            title: bookingTitle,
            type: bookingType,
            start,
            end
        });

        if (res.success) {
            setEvents([...events, res.data]);
            setIsBookingOpen(false);
            setBookingTitle('');
        } else {
            alert(res.error);
        }
        setIsSubmitting(false);
    };

    const getEventsForDay = (day: Date) => events.filter(e => isSameDay(new Date(e.start), day));

    // --- RENDER ---
    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <header className="flex flex-col gap-6 bg-white/50 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-xl">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 italic tracking-tight uppercase flex items-center gap-3">
                            <CalendarIcon className="text-indigo-600" size={28} />
                            Agenda Intelligent
                        </h2>
                        <p className="text-slate-500 font-medium text-sm">Vue globale et pilotage des rendez-vous.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Filter: Commercial */}
                        <Select value={selectedUserFilter} onValueChange={setSelectedUserFilter}>
                            <SelectTrigger className="w-[200px] rounded-xl font-bold bg-white border-slate-200">
                                <UserIcon size={16} className="mr-2 text-slate-400" />
                                <SelectValue placeholder="Tous les commerciaux" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL" className="font-bold text-slate-500">Tous les commerciaux</SelectItem>
                                {collaborators.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="font-bold">{c.firstName} {c.lastName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button variant="outline" className="rounded-xl border-slate-200 text-slate-600 font-bold">
                            <BarChart3 size={18} className="mr-2" /> Analyser
                        </Button>

                        <Button
                            variant="outline"
                            className="rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-indigo-50 hover:text-indigo-600 group"
                            onClick={async () => {
                                const token = prompt("Simuler la connexion Google : Entrez un refresh_token fictif (ex: mock_google_token)");
                                if (token && orgId) {
                                    const { user } = useAuthStore.getState();
                                    if (user) {
                                        await linkGoogleCalendarAction(user.id, token);
                                        alert("Google Calendar lié avec succès ! Tes futurs rendez-vous seront synchronisés.");
                                    }
                                }
                            }}
                        >
                            <CalendarIcon size={18} className="mr-2 group-hover:text-indigo-600" /> Google Calendar
                        </Button>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/50 pt-4">
                    <div className="flex items-center gap-3">
                        {/* View Toggle */}
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode('week')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${viewMode === 'week' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                            >
                                <List size={14} className="mr-1" /> Semaine
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode('month')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${viewMode === 'month' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                            >
                                <Grid3X3 size={14} className="mr-1" /> Mois
                            </Button>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <Button variant="ghost" size="icon" onClick={handlePrev} className="rounded-lg h-8 w-8 text-slate-600 hover:bg-white">
                            <ChevronLeft size={18} />
                        </Button>
                        <span className="px-3 font-bold text-slate-900 text-sm whitespace-nowrap min-w-[120px] text-center">
                            {viewMode === 'week'
                                ? `${format(weekDays[0], 'd MMM', { locale: fr })} - ${format(weekDays[6], 'd MMM', { locale: fr })}`
                                : format(currentDate, 'MMMM yyyy', { locale: fr })
                            }
                        </span>
                        <Button variant="ghost" size="icon" onClick={handleNext} className="rounded-lg h-8 w-8 text-slate-600 hover:bg-white">
                            <ChevronRight size={18} />
                        </Button>
                    </div>
                </div>
            </header>

            {isLoading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="animate-spin text-indigo-600" size={40} />
                </div>
            ) : (
                <>
                    {/* WEEK VIEW */}
                    {viewMode === 'week' && (
                        <div className="grid grid-cols-7 gap-2">
                            {weekDays.map((day) => (
                                <Card key={day.toString()} className={`border-slate-100 shadow-sm rounded-2xl overflow-hidden ${isSameDay(day, new Date()) ? 'ring-2 ring-indigo-500' : ''}`}>
                                    <CardHeader className="p-3 bg-slate-50/80 border-b border-slate-100 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{format(day, 'EEE', { locale: fr })}</p>
                                        <p className={`text-lg font-black ${isSameDay(day, new Date()) ? 'text-indigo-600' : 'text-slate-800'}`}>{format(day, 'd')}</p>
                                    </CardHeader>
                                    <CardContent className="p-2 space-y-2 min-h-[250px]">
                                        {getEventsForDay(day).map(event => (
                                            <div key={event.id} className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs group cursor-pointer hover:bg-white transition-colors">
                                                <div className="flex justify-between items-center mb-1">
                                                    <Badge className="text-[8px] bg-indigo-100 text-indigo-600 border-0 font-bold">{event.type}</Badge>
                                                    <span className="text-[10px] font-bold text-slate-400">{format(new Date(event.start), 'HH:mm')}</span>
                                                </div>
                                                <p className="font-bold text-slate-800 truncate mb-1">{event.title}</p>
                                                {event.user && (
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-4 h-4 rounded-full bg-slate-200 text-[8px] flex items-center justify-center font-bold text-slate-600">
                                                            {event.user.firstName.charAt(0)}{event.user.lastName.charAt(0)}
                                                        </div>
                                                        <span className="text-[9px] text-slate-500 font-medium truncate">{event.user.firstName}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <Button variant="ghost" onClick={() => handleOpenBooking(day)} className="w-full h-8 border border-dashed border-slate-200 text-slate-300 hover:text-indigo-500 hover:border-indigo-300 rounded-xl">
                                            <Plus size={14} />
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* MONTH VIEW */}
                    {viewMode === 'month' && (
                        <div className="bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            {/* Day Headers */}
                            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
                                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                                    <div key={d} className="p-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
                                ))}
                            </div>
                            {/* Days Grid */}
                            <div className="grid grid-cols-7">
                                {monthDays.map((day, idx) => {
                                    const dayEvents = getEventsForDay(day);
                                    const isCurrentMonth = isSameMonth(day, currentDate);
                                    const isToday = isSameDay(day, new Date());
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => handleOpenBooking(day)}
                                            className={`min-h-[120px] p-2 border-b border-r border-slate-100 cursor-pointer transition-colors hover:bg-indigo-50/50 ${!isCurrentMonth ? 'bg-slate-50/50' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-sm font-bold ${isToday ? 'bg-indigo-600 text-white w-7 h-7 flex items-center justify-center rounded-full' : isCurrentMonth ? 'text-slate-800' : 'text-slate-300'}`}>
                                                    {format(day, 'd')}
                                                </span>
                                                {dayEvents.length > 0 && (
                                                    <Badge className="text-[8px] bg-indigo-100 text-indigo-600 border-0">{dayEvents.length}</Badge>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                {dayEvents.slice(0, 3).map(event => (
                                                    <div key={event.id} className="flex gap-1 items-center">
                                                        <div className={`w-1 h-4 rounded-full ${event.type === 'MEETING' ? 'bg-amber-400' : 'bg-indigo-400'}`}></div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-bold text-slate-700 truncate leading-none">{event.title}</p>
                                                            {event.user && (
                                                                <p className="text-[8px] text-slate-400 truncate leading-none mt-0.5">{event.user.firstName} {event.user.lastName.charAt(0)}.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <p className="text-[9px] text-slate-400 font-bold pl-2">+{dayEvents.length - 3} autres</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Booking Dialog */}
            <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                <DialogContent className="sm:max-w-lg bg-white/95 backdrop-blur-xl border-slate-200 rounded-3xl p-6 shadow-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 rounded-2xl text-white bg-indigo-600 shadow-lg"><Plus size={22} /></div>
                            <div>
                                <DialogTitle className="text-xl font-black text-slate-900 uppercase">Nouveau Rendez-vous</DialogTitle>
                                <DialogDescription className="text-slate-500 text-sm">
                                    {selectedSlot ? format(selectedSlot, 'EEEE d MMMM yyyy', { locale: fr }) : ''}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 pt-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Titre</label>
                            <Input placeholder="ex: RDV Signature Contrat" value={bookingTitle} onChange={(e) => setBookingTitle(e.target.value)} className="rounded-xl" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Heure de début</label>
                                <Select value={bookingTime} onValueChange={setBookingTime}>
                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'].map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Durée</label>
                                <Select value={bookingDuration} onValueChange={setBookingDuration}>
                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="15">15 min</SelectItem>
                                        <SelectItem value="30">30 min</SelectItem>
                                        <SelectItem value="45">45 min</SelectItem>
                                        <SelectItem value="60">1 heure</SelectItem>
                                        <SelectItem value="90">1h30</SelectItem>
                                        <SelectItem value="120">2 heures</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Collaborateur assigné</label>
                            <Select onValueChange={setSelectedUserId}>
                                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                <SelectContent>
                                    {collaborators.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Type de RDV</label>
                            <Select value={bookingType} onValueChange={setBookingType}>
                                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MEETING">📍 Agence (Présentiel)</SelectItem>
                                    <SelectItem value="CALL">📞 Téléphone</SelectItem>
                                    <SelectItem value="VISIO">💻 Visio</SelectItem>
                                    <SelectItem value="INTERNAL">🔒 Réunion Interne</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button onClick={handleCreateBooking} disabled={isSubmitting || !bookingTitle || !selectedUserId} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 rounded-2xl shadow-lg">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" size={18} />}
                            Confirmer le Rendez-vous
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
