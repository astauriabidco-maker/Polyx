'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
    Fingerprint, Calendar, Clock, MapPin, Users, Plus,
    QrCode, UserCheck, AlertCircle, Search, Building,
    ChevronRight, Download, Printer, X
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';
import {
    getTrainingSessionsAction,
    createTrainingSessionAction,
    getSessionAttendanceAction,
    getTrainingsAction
} from '@/application/actions/attendance.actions';
import { getExamsAction } from '@/application/actions/exam.actions';
import { getAgenciesAction } from '@/application/actions/agency.actions';

export default function AttendancePage() {
    const { activeOrganization, activeMembership } = useAuthStore();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);

    const [sessions, setSessions] = useState<any[]>([]);
    const [agencies, setAgencies] = useState<any[]>([]);
    const [trainings, setTrainings] = useState<any[]>([]);
    const [selectedSession, setSelectedSession] = useState<any | null>(null);
    const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
    const [qrValue, setQrValue] = useState("");

    useEffect(() => {
        if (activeOrganization?.id) {
            loadData();
        }
    }, [activeOrganization?.id]);

    // Polling for real-time monitoring
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (selectedSession) {
            interval = setInterval(async () => {
                const res = await getSessionAttendanceAction(selectedSession.id);
                if (res.success) setAttendanceLogs(res.logs || []);
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [selectedSession?.id]);

    async function loadData() {
        setIsLoading(true);
        const [sRes, aRes, tRes] = await Promise.all([
            getTrainingSessionsAction(activeOrganization!.id),
            getAgenciesAction(activeOrganization!.id),
            getTrainingsAction(activeOrganization!.id)
        ]);
        if (sRes.success) setSessions(sRes.sessions || []);
        if (aRes.success) setAgencies(aRes.agencies || []);
        if (tRes.success) setTrainings(tRes.trainings || []);
        setIsLoading(false);
    }

    async function handleViewAttendance(session: any) {
        setSelectedSession(session);
        const res = await getSessionAttendanceAction(session.id);
        if (res.success) setAttendanceLogs(res.logs || []);
    }

    function handleGenerateQr(session: any) {
        setSelectedSession(session);
        // In a real app, this would be a secure token URL
        const domain = typeof window !== 'undefined' ? window.location.origin : '';
        const value = `${domain}/sign/${session.id}`;
        setQrValue(value);
        setIsQrModalOpen(true);
    }

    const handleCreateSession = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const data = {
            organisationId: activeOrganization!.id,
            trainingId: formData.get('trainingId') as string,
            agencyId: formData.get('agencyId') as string,
            date: new Date(formData.get('date') as string),
            startTime: formData.get('startTime') as string,
            endTime: formData.get('endTime') as string,
            title: formData.get('title') as string,
            location: formData.get('location') as string,
            formateurName: formData.get('formateurName') as string,
        };

        setIsLoading(true);
        const res = await createTrainingSessionAction(data);
        if (res.success) {
            toast({ title: "Session créée", description: "La session d'émargement est prête." });
            loadData();
            setIsSessionModalOpen(false);
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
        setIsLoading(false);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <Fingerprint size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest">Opérations & Conformité</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">Émargement Numérique</h1>
                    <p className="text-slate-500 mt-1 max-w-2xl">
                        Gérez les présences en temps réel. Générez des QR codes pour vos formateurs ou validez les signatures manuellement.
                    </p>
                </div>
                <Button
                    onClick={() => setIsSessionModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-bold shadow-lg shadow-blue-100"
                >
                    <Plus size={20} className="mr-2" /> Nouvelle Session
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Session List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Calendar size={20} className="text-blue-500" />
                            Sessions du jour & à venir
                        </h2>
                        <div className="flex gap-2">
                            <Input placeholder="Filtrer par agence..." className="h-9 w-48 text-xs" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {sessions.length > 0 ? sessions.map((session) => (
                            <Card
                                key={session.id}
                                className={`overflow-hidden border-slate-200 hover:border-blue-300 transition-all cursor-pointer ${selectedSession?.id === session.id ? 'ring-2 ring-blue-500' : ''}`}
                                onClick={() => handleViewAttendance(session)}
                            >
                                <CardContent className="p-0">
                                    <div className="flex items-stretch">
                                        <div className="w-24 bg-slate-50 border-r border-slate-100 flex flex-col items-center justify-center text-center p-2">
                                            <span className="text-[10px] uppercase font-black text-slate-400">{format(new Date(session.date), 'MMM', { locale: fr })}</span>
                                            <span className="text-2xl font-black text-slate-900">{format(new Date(session.date), 'dd')}</span>
                                            <span className="text-[10px] font-bold text-blue-600">{session.startTime}</span>
                                        </div>
                                        <div className="flex-1 p-4 flex flex-col justify-center">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-slate-900">{session.title || "Session de formation"}</h3>
                                                <Badge variant="outline" className="text-[9px] uppercase font-black bg-emerald-50 text-emerald-700 border-emerald-100">
                                                    {session.status === 'OPEN' ? 'En cours' : 'Terminée'}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-wrap gap-4 mt-2">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Building size={14} className="text-slate-400" />
                                                    {session.agency?.name || "Siège OF"}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Users size={14} className="text-slate-400" />
                                                    <span className="font-bold text-blue-600">{session._count?.attendanceLogs || 0}</span> émargés
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4 flex flex-col gap-2 justify-center border-l border-slate-50">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-[10px] font-black uppercase tracking-tighter"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleGenerateQr(session);
                                                }}
                                            >
                                                <QrCode size={14} className="mr-1" /> QR Code
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="h-8 text-[10px] font-black uppercase tracking-tighter bg-slate-900"
                                            >
                                                <Fingerprint size={14} className="mr-1" /> Manuel
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )) : (
                            <div className="py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-6">
                                <Calendar size={48} className="text-slate-200 mb-4" />
                                <h3 className="text-lg font-bold text-slate-900">Aucune session programmée</h3>
                                <p className="text-sm text-slate-400 max-w-xs">Commencez par créer une session pour générer les preuves d'émargement.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Real-time Monitor */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <UserCheck size={20} className="text-emerald-500" />
                        Suivi en direct
                    </h2>

                    {selectedSession ? (
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b border-slate-200 pb-4">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">
                                    {selectedSession.title}
                                </CardTitle>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-xs font-bold text-emerald-600 uppercase">Live</span>
                                    </div>
                                    <span className="text-2xl font-black text-slate-900">
                                        {attendanceLogs.length}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100">
                                    {attendanceLogs.length > 0 ? attendanceLogs.map((log) => (
                                        <div key={log.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 border border-blue-200">
                                                    {log.folder.learner.firstName[0]}{log.folder.learner.lastName[0]}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900">{log.folder.learner.firstName} {log.folder.learner.lastName}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono tracking-tighter">
                                                        Signé à {format(new Date(log.createdAt), 'HH:mm:ss')}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] h-4">OK</Badge>
                                        </div>
                                    )) : (
                                        <div className="p-12 text-center">
                                            <AlertCircle size={32} className="mx-auto text-slate-200 mb-2" />
                                            <p className="text-xs text-slate-400">En attente de la première signature...</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1 text-[10px] font-bold h-8">
                                    <Download size={12} className="mr-1" /> Export PDF
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1 text-[10px] font-bold h-8">
                                    <Printer size={12} className="mr-1" /> Imprimer
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        <div className="h-[400px] border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
                            <Fingerprint size={48} className="text-slate-200 mb-4" />
                            <p className="text-sm font-medium text-slate-400">Sélectionnez une session pour voir l'émargement en direct.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: New Session */}
            <Modal isOpen={isSessionModalOpen} onClose={() => setIsSessionModalOpen(false)} title="Créer une session de formation">
                <form onSubmit={handleCreateSession} className="space-y-4">
                    <Input name="title" label="Intitulé de la session" placeholder="ex: Cours d'Anglais Business - Niveau B1" required />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Formation</label>
                            <Select name="trainingId" required>
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Sélectionnez..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {trainings.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.title} ({t.code})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Agence</label>
                            <Select name="agencyId" required>
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Choisir l'agence..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {agencies.map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Input type="date" name="date" label="Date" required />
                        <Input type="time" name="startTime" label="Début" defaultValue="09:00" required />
                        <Input type="time" name="endTime" label="Fin" defaultValue="12:00" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input name="location" label="Lieu / Salle" placeholder="ex: Salle 104 ou Zoom" required />
                        <Input name="formateurName" label="Formateur" placeholder="Nom du formateur" />
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <Button type="button" variant="ghost" onClick={() => setIsSessionModalOpen(false)}>Annuler</Button>
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 h-11 px-8 font-black shadow-lg shadow-blue-100">
                            {isLoading ? 'Création...' : 'Valider la Session'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: QR Code Display */}
            <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="QR Code d'Émargement">
                <div className="flex flex-col items-center justify-center py-12 space-y-8">
                    <div className="relative p-6 bg-white rounded-3xl shadow-2xl border border-slate-200">
                        <QRCodeSVG value={qrValue} size={280} level="H" includeMargin={true} />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-lg">
                            <div className="h-10 w-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xl">P</div>
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight italic">{selectedSession?.title}</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                            Demandez aux apprenants de scanner ce code pour signer leur présence.
                            <span className="block font-bold text-blue-600 mt-1">Lien: {qrValue.split('/').pop()}</span>
                        </p>
                    </div>

                    <div className="flex gap-4 w-full px-8">
                        <Button variant="outline" className="flex-1 h-12 font-bold gap-2">
                            <Printer size={18} /> Imprimer
                        </Button>
                        <Button className="flex-1 h-12 font-bold bg-slate-900 hover:bg-black gap-2">
                            <Plus size={18} /> Manuel
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
