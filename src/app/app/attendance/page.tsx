
'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock, MapPin, Users, ChevronRight, FileText } from "lucide-react";
import { getTrainingSessionsAction } from "@/application/actions/attendance.actions";
import { useAuthStore } from "@/application/store/auth-store";
import { CreateSessionModal } from "@/components/attendance/CreateSessionModal";
import Link from "next/link";

export default function AttendanceDashboardPage() {
    const { activeOrganization, activeAgency } = useAuthStore();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        if (activeOrganization?.id) {
            loadSessions();
        }
    }, [activeOrganization?.id, activeAgency?.id]);

    async function loadSessions() {
        setLoading(true);
        const res = await getTrainingSessionsAction(activeOrganization!.id, activeAgency?.id);
        if (res.success) {
            setSessions(res.sessions || []);
        }
        setLoading(false);
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestion des Émargements</h1>
                    <p className="text-slate-500 mt-1">Gérez vos sessions de formation et les présences stagiaires.</p>
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-lg shadow-indigo-200"
                >
                    <Plus size={18} />
                    Nouvelle Session
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse bg-slate-50 border-slate-100">
                            <div className="h-48" />
                        </Card>
                    ))}
                </div>
            ) : sessions.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Aucune session active</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-2">Ouvrez votre première session d'émargement pour commencer à collecter les signatures.</p>
                    <Button variant="outline" className="mt-6" onClick={() => setIsCreateModalOpen(true)}>
                        Créer une session
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sessions.map((session) => (
                        <Card key={session.id} className="group hover:border-indigo-300 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md border-slate-200 bg-white">
                            <Link href={`/app/attendance/sessions/${session.id}`}>
                                <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                                    <div className="flex justify-between items-start">
                                        <Badge className={session.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600'}>
                                            {session.status === 'OPEN' ? '🟢 En cours' : 'Terminée'}
                                        </Badge>
                                        <div className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>
                                    <CardTitle className="text-lg font-bold text-slate-900 mt-2 line-clamp-1">
                                        {session.title || session.training?.title || "Session sans titre"}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Calendar size={14} className="text-slate-400" />
                                            <span>{new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Clock size={14} className="text-slate-400" />
                                            <span>{session.startTime} - {session.endTime}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <MapPin size={14} className="text-slate-400" />
                                            <span>{session.location}</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                                                {session.formateurName?.[0] || "?"}
                                            </div>
                                            <span className="text-xs text-slate-500 truncate max-w-[120px]">{session.formateurName || "Indéfini"}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs font-bold text-indigo-600">
                                            <Users size={12} />
                                            <span>{session.attendanceLogs?.length || 0} émargés</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Link>
                        </Card>
                    ))}
                </div>
            )}

            <CreateSessionModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreated={loadSessions}
                activeAgencyId={activeAgency?.id}
            />
        </div>
    );
}
