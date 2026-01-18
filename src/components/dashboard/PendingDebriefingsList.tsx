'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPendingDebriefingsAction } from '@/application/actions/agenda.actions';
import { Clock, AlertCircle, Phone, User, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PendingDebriefingsList({ orgId, agencyId }: { orgId: string, agencyId?: string }) {
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            const res = await getPendingDebriefingsAction(orgId, agencyId === 'ALL' ? undefined : agencyId);
            if (res.success) setEvents(res.data);
            setIsLoading(false);
        }
        load();
    }, [orgId, agencyId]);

    if (isLoading) return (
        <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin text-indigo-600" size={24} />
        </div>
    );

    if (events.length === 0) return (
        <Card className="border-0 shadow-xl shadow-slate-100/50 rounded-3xl bg-emerald-50/30 border border-emerald-100/50">
            <CardContent className="p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                    <AlertCircle size={32} />
                </div>
                <h3 className="text-emerald-900 font-black uppercase text-xs tracking-widest">Tout est à jour !</h3>
                <p className="text-emerald-700/60 text-sm mt-2 max-w-xs mx-auto">Aucun rendez-vous n'est en attente de débriefing. Très bon suivi opérationnel !</p>
            </CardContent>
        </Card>
    );

    return (
        <Card className="border-0 shadow-2xl shadow-indigo-100/50 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20">
            <CardHeader className="border-b border-slate-50 p-6 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                    <AlertCircle size={18} className="text-orange-500" />
                    Rendez-vous en attente de débriefing ({events.length})
                </CardTitle>
                <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Action requise</span>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                    {events.map((event) => (
                        <div key={event.id} className="p-4 hover:bg-slate-50/50 transition-colors group">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-900">{event.lead.firstName} {event.lead.lastName}</p>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{event.lead.source || 'Direct'}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <div className="flex items-center gap-1 font-medium italic text-indigo-600">
                                            <User size={12} />
                                            {event.user.firstName} {event.user.lastName}
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <Clock size={12} />
                                            Fini {formatDistanceToNow(new Date(event.end), { addSuffix: true, locale: fr })}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-orange-600 uppercase mb-1">Retard</p>
                                    <p className="text-sm font-black text-slate-900">
                                        {Math.floor(event.delayInMinutes / 60)}h {event.delayInMinutes % 60}min
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 border-slate-200">
                                    <Phone size={12} className="mr-2" /> Relancer Comm.
                                </Button>
                                <Button size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200">
                                    Voir Fiche <ArrowRight size={12} className="ml-2" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
