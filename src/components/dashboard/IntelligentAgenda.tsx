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
    Bell,
    Settings,
    Globe,
    MapPin,
    Map
} from 'lucide-react';
import {
    format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay,
    startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth,
    setHours, setMinutes, subWeeks, addWeeks, subDays
} from 'date-fns';
import { fr } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import { getAgendaEventsAction, getAgencyCollaboratorsAction, createAppointmentAction, linkGoogleCalendarAction, getOrganizationCollaboratorsAction, scheduleReminderAction, updateAppointmentAction, getAISuggestedSlotsAction } from '@/application/actions/agenda.actions';
import { getAgenciesAction } from '@/application/actions/agency.actions';
import { useAuthStore } from '@/application/store/auth-store';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const AgendaMap = dynamic(() => import('@/components/agenda/AgendaMap'), { ssr: false });
const EventDetailModal = dynamic(() => import('@/components/agenda/EventDetailModal').then(mod => mod.EventDetailModal), { ssr: false });
const AvailabilityManager = dynamic(() => import('@/components/agenda/AvailabilityManager').then(mod => mod.AvailabilityManager), { ssr: false });
const AgendaStatsModal = dynamic(() => import('@/components/agenda/AgendaStatsModal').then(mod => mod.AgendaStatsModal), { ssr: false });
const AgendaManagerDashboard = dynamic(() => import('./AgendaManagerDashboard'), { ssr: false });

export default function IntelligentAgenda({ orgId, agencyId }: { orgId: string, agencyId: string }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
    const [showMap, setShowMap] = useState(false); // Map View Toggle
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showManagerDashboard, setShowManagerDashboard] = useState(false);
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [agencies, setAgencies] = useState<any[]>([]);

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

    // AI Suggestions
    const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
    const [isAiLoading, setIsAiLoading] = useState(false);

    // NEW: Event Detail Modal & Reminder
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [sendReminder, setSendReminder] = useState(false);
    const [reminderHours, setReminderHours] = useState(24);
    const [showAvailability, setShowAvailability] = useState(false);

    const { user } = useAuthStore();

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            const agencyFilter = selectedAgencyFilter === 'ALL' ? undefined : selectedAgencyFilter;
            const userFilter = selectedUserFilter === 'ALL' ? undefined : selectedUserFilter;

            const effectiveAgencyId = agencyId || agencyFilter;

            const [eventsRes, colabsRes] = await Promise.all([
                getAgendaEventsAction(orgId, effectiveAgencyId, userFilter),
                effectiveAgencyId
                    ? getAgencyCollaboratorsAction(effectiveAgencyId)
                    : getOrganizationCollaboratorsAction(orgId)
            ]);

            if (eventsRes.success) setEvents(eventsRes.data || []);
            if (colabsRes.success) setCollaborators(colabsRes.data || []);
            setIsLoading(false);
        }
        load();
    }, [orgId, agencyId, selectedAgencyFilter, selectedUserFilter, currentDate]);

    useEffect(() => {
        if (!agencyId && orgId) {
            getAgenciesAction(orgId).then(res => {
                if (res.success) setAgencies(res.agencies);
            });
        }
    }, [orgId, agencyId]);

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
    const handleOpenBooking = async (day: Date) => {
        setSelectedSlot(day);
        setIsBookingOpen(true);

        // Fetch AI Suggestions
        setIsAiLoading(true);
        const res = await getAISuggestedSlotsAction(orgId, agencyId || 'ALL', 45); // Default 45m
        if (res.success) setAiSuggestions(res.data || []);
        setIsAiLoading(false);
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
            // Schedule reminder if enabled
            if (sendReminder && res.data?.id) {
                await scheduleReminderAction(res.data.id, 'sms', reminderHours);
            }
            setEvents([...events, res.data]);
            setIsBookingOpen(false);
            setBookingTitle('');
            setSendReminder(false);
        } else {
            alert(res.error);
        }
        setIsSubmitting(false);
    };

    const onDragEnd = async (result: any) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId) return;

        const event = events.find(e => e.id === draggableId);
        if (!event) return;

        // Calculate new start/end based on the destination day
        const targetDay = new Date(destination.droppableId);
        const oldStart = new Date(event.start);
        const oldEnd = new Date(event.end);

        const newStart = setMinutes(setHours(targetDay, oldStart.getHours()), oldStart.getMinutes());
        const newEnd = setMinutes(setHours(targetDay, oldEnd.getHours()), oldEnd.getMinutes());

        // Optimistic UI Update
        const updatedEvents = events.map(e =>
            e.id === draggableId ? { ...e, start: newStart, end: newEnd } : e
        );
        setEvents(updatedEvents);

        // API Call
        const res = await updateAppointmentAction(draggableId, {
            start: newStart,
            end: newEnd
        });

        if (!res.success) {
            alert("Erreur lors du déplacement du rendez-vous.");
            // Rollback (Reload events)
            handleRefresh();
        }
    };

    const handleEventClick = (event: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedEvent(event);
    };

    const handleRefresh = async () => {
        setIsLoading(true);
        const res = await getAgendaEventsAction(orgId, agencyId || undefined, selectedUserFilter === 'ALL' ? undefined : selectedUserFilter);
        if (res.success) setEvents(res.data || []);
        setIsLoading(false);
        setSelectedEvent(null);
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
                        <Button
                            variant="outline"
                            className={`rounded-xl font-bold ${showMap ? 'bg-indigo-600 text-white' : 'border-slate-200 text-slate-600'}`}
                            onClick={() => {
                                setShowMap(!showMap);
                                setShowManagerDashboard(false);
                            }}
                        >
                            <Map size={18} className="mr-2" /> {showMap ? 'Vue Calendrier' : 'Vue Carte'}
                        </Button>

                        <Button
                            variant="outline"
                            className={`rounded-xl font-bold ${showManagerDashboard ? 'bg-indigo-600 text-white' : 'border-slate-200 text-slate-600'}`}
                            onClick={() => {
                                setShowManagerDashboard(!showManagerDashboard);
                                setShowMap(false);
                            }}
                        >
                            <BarChart3 size={18} className="mr-2" /> {showManagerDashboard ? 'Vue Agenda' : 'Dashboard Pilotage'}
                        </Button>

                        {/* Filter: Agency (Only if no agencyId prop) */}
                        {!agencyId && (
                            <Select value={selectedAgencyFilter} onValueChange={setSelectedAgencyFilter}>
                                <SelectTrigger className="w-[180px] rounded-xl font-bold bg-white border-slate-200">
                                    <SelectValue placeholder="Toutes les agences" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Toutes les agences</SelectItem>
                                    {agencies.map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Filter: Commercial */}
                        <Select value={selectedUserFilter} onValueChange={setSelectedUserFilter}>
                            <SelectTrigger className="w-[200px] rounded-xl font-bold bg-white border-slate-200">
                                <SelectValue placeholder="Tous les collaborateurs" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tous les collaborateurs</SelectItem>
                                {collaborators.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            className="rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                            onClick={() => setShowStatsModal(true)}
                        >
                            <BarChart3 size={18} className="mr-2" /> Analyser
                        </Button>

                        <AgendaStatsModal
                            isOpen={showStatsModal}
                            onClose={() => setShowStatsModal(false)}
                            orgId={orgId!}
                        />

                        <Button
                            variant="outline"
                            className="rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                            onClick={() => setShowAvailability(true)}
                        >
                            <Settings size={18} className="mr-2" /> Disponibilités
                        </Button>

                        <Button
                            variant="outline"
                            className="rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                            onClick={() => {
                                if (typeof window !== 'undefined' && user) {
                                    const url = `${window.location.origin}/book/${user.id}`;
                                    navigator.clipboard.writeText(url);
                                    alert("Lien de réservation copié : " + url);
                                }
                            }}
                        >
                            <Globe size={18} className="mr-2" /> Lien Public
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
            {/* MAIN CONTENT AREA */}
            {isLoading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="animate-spin text-indigo-600" size={40} />
                </div>
            ) : showManagerDashboard ? (
                <AgendaManagerDashboard orgId={orgId} agencyId={selectedAgencyFilter} />
            ) : showMap ? (
                <div className="h-[700px] border-0 shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-500">
                    <AgendaMap events={events} />
                </div>
            ) : (
                <>
                    {/* WEEK VIEW */}
                    {viewMode === 'week' && (
                        <DragDropContext onDragEnd={onDragEnd}>
                            <div className="grid grid-cols-7 gap-2">
                                {weekDays.map((day) => (
                                    <Droppable key={day.toISOString()} droppableId={day.toISOString()}>
                                        {(provided, snapshot) => (
                                            <Card
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`border-slate-100 shadow-sm rounded-2xl overflow-hidden ${isSameDay(day, new Date()) ? 'ring-2 ring-indigo-500' : ''} ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}
                                            >
                                                <CardHeader className="p-3 bg-slate-50/80 border-b border-slate-100 text-center">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{format(day, 'EEE', { locale: fr })}</p>
                                                    <p className={`text-lg font-black ${isSameDay(day, new Date()) ? 'text-indigo-600' : 'text-slate-800'}`}>{format(day, 'd')}</p>
                                                </CardHeader>
                                                <CardContent className="p-2 space-y-2 min-h-[450px]">
                                                    {getEventsForDay(day).map((event, index) => (
                                                        <Draggable key={event.id} draggableId={event.id} index={index}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    onClick={(e) => handleEventClick(event, e)}
                                                                    className={`p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs group cursor-pointer hover:bg-white transition-all ${snapshot.isDragging ? 'shadow-xl ring-2 ring-indigo-600 rotate-2 opacity-80' : ''}`}
                                                                >
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
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                    <Button variant="ghost" onClick={() => handleOpenBooking(day)} className="w-full h-8 border border-dashed border-slate-200 text-slate-300 hover:text-indigo-500 hover:border-indigo-300 rounded-xl">
                                                        <Plus size={14} />
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </Droppable>
                                ))}
                            </div>
                        </DragDropContext>
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
                                {monthDays.map((mDay, idx) => {
                                    const dayEvents = getEventsForDay(mDay);
                                    const isCurrentMonth = isSameMonth(mDay, currentDate);
                                    const isToday = isSameDay(mDay, new Date());
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => handleOpenBooking(mDay)}
                                            className={`min-h-[120px] p-2 border-b border-r border-slate-100 cursor-pointer transition-colors hover:bg-indigo-50/50 ${!isCurrentMonth ? 'bg-slate-50/50' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-sm font-bold ${isToday ? 'bg-indigo-600 text-white w-7 h-7 flex items-center justify-center rounded-full' : isCurrentMonth ? 'text-slate-800' : 'text-slate-300'}`}>
                                                    {format(mDay, 'd')}
                                                </span>
                                                {dayEvents.length > 0 && (
                                                    <Badge className="text-[8px] bg-indigo-100 text-indigo-600 border-0">{dayEvents.length}</Badge>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                {dayEvents.slice(0, 3).map(event => (
                                                    <div
                                                        key={event.id}
                                                        onClick={(e) => handleEventClick(event, e)}
                                                        className="flex gap-1 items-center hover:bg-white p-1 rounded cursor-pointer"
                                                    >
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

                    {/* AI SUGGESTIONS SECTION */}
                    <div className="mb-6">
                        <h4 className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase mb-3">
                            <Sparkles size={14} /> Suggestions IA (Optimisation Trajet & Conversion)
                        </h4>
                        {isAiLoading ? (
                            <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                                <Loader2 size={12} className="animate-spin" /> Analyse des meilleures opportunités...
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {aiSuggestions.map((s, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setBookingTime(format(new Date(s.start), 'HH:mm'));
                                            setSelectedUserId(s.userId);
                                        }}
                                        className="text-left p-3 rounded-2xl border border-indigo-100 bg-indigo-50/30 hover:bg-indigo-600 hover:text-white group transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-bold uppercase">{s.dayLabel.split(' ')[0]} {format(new Date(s.start), 'HH:mm')}</span>
                                            <Badge className="bg-white text-indigo-600 text-[8px] font-black">{Math.round(s.aiScore * 100)}% Match</Badge>
                                        </div>
                                        <p className="text-[10px] font-bold truncate opacity-80">{s.userName}</p>
                                        {s.aiInsights && s.aiInsights.length > 0 && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {s.aiInsights.slice(0, 1).map((insight: string, i: number) => (
                                                    <span key={i} className="text-[8px] italic opacity-60 line-clamp-1">{insight}</span>
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                        {aiSuggestions.length === 0 && !isAiLoading && (
                            <p className="text-[10px] text-slate-400">Aucune suggestion optimale trouvée pour cette période.</p>
                        )}
                    </div>

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

                        {/* Reminder Toggle */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Bell size={16} className="text-amber-600" />
                                    <span className="text-sm font-bold text-amber-700">Envoyer un rappel SMS</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={sendReminder}
                                    onChange={(e) => setSendReminder(e.target.checked)}
                                    className="w-5 h-5 rounded accent-amber-500"
                                />
                            </div>
                            {sendReminder && (
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-xs text-amber-600">Délai :</span>
                                    <select
                                        value={reminderHours}
                                        onChange={(e) => setReminderHours(Number(e.target.value))}
                                        className="border border-amber-200 rounded-lg px-2 py-1 text-xs bg-white"
                                    >
                                        <option value={1}>1h avant</option>
                                        <option value={24}>24h avant</option>
                                        <option value={48}>48h avant</option>
                                    </select>
                                </div>
                            )}
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

            {/* Event Detail Modal */}
            {
                selectedEvent && (
                    <EventDetailModal
                        event={selectedEvent}
                        onClose={() => setSelectedEvent(null)}
                        onUpdate={handleRefresh}
                    />
                )
            }

            {/* Availability Manager Dialog */}
            <Dialog open={showAvailability} onOpenChange={setShowAvailability}>
                <DialogContent className="sm:max-w-xl bg-white rounded-3xl p-0 overflow-hidden">
                    {user && <AvailabilityManager userId={user.id} />}
                </DialogContent>
            </Dialog>
        </div >
    );
}
