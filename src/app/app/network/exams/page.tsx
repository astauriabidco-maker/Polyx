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
    Calendar, MapPin, Users, Plus, ClipboardCheck,
    CheckCircle2, Clock, AlertCircle, Trash2, Edit3,
    UserPlus, Search, Building, GraduationCap, X
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    getExamsAction,
    getExamSessionsAction,
    createExamSessionAction,
    getRegistrationsForSessionAction,
    registerLearnerToSessionAction,
    updateRegistrationStatusAction,
    getEligibleLearnersAction,
    updateSessionStatusAction,
    confirmSessionAction
} from '@/application/actions/exam.actions';
import { getAgenciesAction } from '@/application/actions/agency.actions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ExamManagementPage() {
    const { activeOrganization, activeMembership } = useAuthStore();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

    const [exams, setExams] = useState<any[]>([]);
    const [agencies, setAgencies] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedSession, setSelectedSession] = useState<any | null>(null);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [eligibleLearners, setEligibleLearners] = useState<any[]>([]);
    const [selectedLearner, setSelectedLearner] = useState<any | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (activeOrganization?.id) {
            loadData();
        }
    }, [activeOrganization?.id]);

    async function loadData() {
        setIsLoading(true);
        const [eRes, sRes, aRes] = await Promise.all([
            getExamsAction(activeOrganization!.id),
            getExamSessionsAction(activeOrganization!.id),
            getAgenciesAction(activeOrganization!.id)
        ]);
        if (eRes.success) setExams(eRes.exams || []);
        if (sRes.success) setSessions(sRes.sessions || []);
        if (aRes.success) setAgencies(aRes.agencies || []);
        setIsLoading(false);
    }

    async function loadRegistrations(sessionId: string) {
        const res = await getRegistrationsForSessionAction(sessionId);
        if (res.success) setRegistrations(res.registrations || []);
    }

    const handleCreateSession = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const dateStr = formData.get('date') as string;
        const timeStr = formData.get('time') as string;
        const examDate = new Date(`${dateStr}T${timeStr}`);

        const agencyId = formData.get('agencyId') as string;

        const data = {
            organisationId: activeOrganization!.id,
            examId: formData.get('examId') as string,
            agencyId: agencyId === "none" ? undefined : agencyId,
            date: examDate,
            location: formData.get('location') as string,
            minSpots: parseInt(formData.get('minSpots') as string) || 1,
            totalSpots: parseInt(formData.get('totalSpots') as string) || 10,
            priceHt: parseFloat(formData.get('priceHt') as string) || 0,
        };

        setIsLoading(true);
        const res = await createExamSessionAction(data);
        if (res.success) {
            toast({ title: "Session créée", description: "La session d'examen a été programmée." });
            loadData();
            setIsSessionModalOpen(false);
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
        setIsLoading(false);
    };

    const handleUpdateStatus = async (regId: string, status: string, score: string) => {
        const res = await updateRegistrationStatusAction(regId, status, score);
        if (res.success) {
            toast({ title: "Statut mis à jour" });
            if (selectedSession) loadRegistrations(selectedSession.id);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (activeOrganization?.id && searchTerm.length >= 2) {
                searchLearners(searchTerm);
            } else {
                setEligibleLearners([]);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, activeOrganization?.id]);

    async function searchLearners(term: string) {
        const res = await getEligibleLearnersAction(activeOrganization!.id, term);
        if (res.success) setEligibleLearners(res.learners || []);
    }

    const handleRegisterLearner = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedSession || !selectedLearner) return;

        const formData = new FormData(e.currentTarget);
        const data = {
            sessionId: selectedSession.id,
            learnerId: selectedLearner.id,
            motivation: formData.get('motivation') as string,
            idNumber: formData.get('idNumber') as string,
            nativeLanguage: formData.get('nativeLanguage') as string,
        };

        setIsRegistering(true);
        const res = await registerLearnerToSessionAction(data);
        if (res.success) {
            toast({ title: "Inscription validée", description: "L'apprenant a été inscrit à la session. En attente de validation." });
            loadRegistrations(selectedSession.id);
            loadData();
            setIsRegisterModalOpen(false);
            setSelectedLearner(null);
            setSearchTerm("");
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
        setIsRegistering(false);
    };

    const handleValidateAgency = async () => {
        if (!selectedSession) return;
        setIsUpdatingStatus(true);
        const res = await updateSessionStatusAction(selectedSession.id, "VALIDATION_PENDING");
        if (res.success) {
            toast({ title: "Session validée par l'agence", description: "En attente de confirmation par le responsable OF." });
            loadData();
            setSelectedSession(res.session);
        } else {
            toast({ title: "Échec de validation", description: res.error, variant: "destructive" });
        }
        setIsUpdatingStatus(false);
    };

    const handleConfirmOF = async () => {
        if (!selectedSession) return;
        setIsUpdatingStatus(true);
        const res = await confirmSessionAction(selectedSession.id);
        if (res.success) {
            toast({ title: "Session confirmée", description: "La session est confirmée et les factures ont été générées." });
            loadData();
            const s = sessions.find(s => s.id === selectedSession.id);
            if (s) setSelectedSession({ ...s, status: 'CONFIRMED' });
            else loadData().then(() => setSelectedSession(null));
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
        setIsUpdatingStatus(false);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'WAITING_FOR_REGISTRATION': return <Badge className="bg-amber-100 text-amber-700 border-amber-200 uppercase tracking-tighter font-black">En attente inscriptions</Badge>;
            case 'OPEN': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Ouverte</Badge>;
            case 'VALIDATION_PENDING': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">En attente validation OF</Badge>;
            case 'CONFIRMED': return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Confirmée / Facturée</Badge>;
            case 'COMPLETED': return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Terminée</Badge>;
            case 'CANCELLED': return <Badge className="bg-red-100 text-red-700 border-red-200">Annulée</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <ClipboardCheck size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest">Certification & Examens</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">Sessions d'Examen</h1>
                    <p className="text-slate-500 mt-1 max-w-2xl">
                        Programmez les sessions CCI et gérez les inscriptions de vos candidats.
                        Chaque inscription est facturée à la franchise correspondante.
                    </p>
                </div>
                <Button
                    onClick={() => setIsSessionModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-bold shadow-lg shadow-blue-100"
                >
                    <Plus size={20} className="mr-2" /> Programmer une Session
                </Button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white border-slate-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <p className="text-xl font-black text-slate-900">{sessions.filter(s => s.status === 'OPEN').length}</p>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Sessions Ouvertes</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-xl font-black text-slate-900">
                                {sessions.reduce((acc, s) => acc + (s._count?.registrations || 0), 0)}
                            </p>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Inscriptions Totales</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Session List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sessions.map((session) => (
                    <Card
                        key={session.id}
                        className={`overflow-hidden border-slate-200 hover:border-blue-300 transition-all cursor-pointer ${selectedSession?.id === session.id ? 'ring-2 ring-blue-500' : ''}`}
                        onClick={() => {
                            setSelectedSession(session);
                            loadRegistrations(session.id);
                        }}
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">{session.exam.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">{session.name}</Badge>
                                        <p className="text-xs text-slate-400 font-mono">{session.exam.code}</p>
                                    </div>
                                </div>
                                {getStatusBadge(session.status)}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <Calendar size={16} className="text-slate-400" />
                                    <span className="font-semibold">
                                        {format(new Date(session.date), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <MapPin size={16} className="text-slate-400" />
                                    <span>{session.location}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <Users size={16} className="text-slate-400" />
                                    <span>
                                        <span className="font-bold text-blue-600">{session._count?.registrations || 0}</span> / {session.totalSpots} places occupées
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                                <div className="text-sm">
                                    <span className="text-slate-400">Tarif/Candidat: </span>
                                    <span className="font-bold text-slate-900">{session.priceHt}€ HT</span>
                                </div>
                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold">
                                    Gérer les inscriptions →
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Inscriptions Side Panel / Modal for the selected session */}
            {selectedSession && (
                <Card className="border-blue-200 shadow-xl animate-in slide-in-from-bottom duration-300">
                    <CardHeader className="bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl">Participants - {selectedSession.exam.name}</CardTitle>
                            <CardDescription>Session du {format(new Date(selectedSession.date), "dd/MM/yyyy")}</CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-white text-blue-700 border-blue-200 hover:bg-blue-50 font-bold"
                                onClick={() => setIsRegisterModalOpen(true)}
                                disabled={selectedSession.status !== 'WAITING_FOR_REGISTRATION' && selectedSession.status !== 'OPEN'}
                            >
                                <UserPlus size={16} className="mr-2" /> Inscrire un Apprenant
                            </Button>

                            {/* Validation Buttons */}
                            {selectedSession.status === 'WAITING_FOR_REGISTRATION' && (
                                <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 font-bold"
                                    onClick={handleValidateAgency}
                                    disabled={isUpdatingStatus}
                                >
                                    Valider pour l'agence
                                </Button>
                            )}

                            {selectedSession.status === 'VALIDATION_PENDING' && (
                                <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                                    onClick={handleConfirmOF}
                                    disabled={isUpdatingStatus}
                                >
                                    Confirmer & Facturer (OF)
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-slate-50/50 text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">Apprenant</th>
                                        <th className="px-6 py-4 font-bold">Franchise / Agence</th>
                                        <th className="px-6 py-4 font-bold">Statut</th>
                                        <th className="px-6 py-4 font-bold">Score</th>
                                        <th className="px-6 py-4 font-bold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {registrations.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                                Aucun participant inscrit pour le moment.
                                            </td>
                                        </tr>
                                    ) : (
                                        registrations.map((reg) => (
                                            <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-semibold text-slate-900">
                                                    {reg.learner.firstName} {reg.learner.lastName}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700">{reg.learner.agency?.franchise?.name || 'Direct OF'}</span>
                                                        <span className="text-xs text-slate-500">{reg.learner.agency?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Select
                                                        defaultValue={reg.status}
                                                        onValueChange={(val) => handleUpdateStatus(reg.id, val, reg.score || "")}
                                                    >
                                                        <SelectTrigger className="h-8 w-32 text-xs font-bold">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="WAITING_FOR_VALIDATION">En attente validation</SelectItem>
                                                            <SelectItem value="REGISTERED">Inscrit</SelectItem>
                                                            <SelectItem value="PRESENT">Présent</SelectItem>
                                                            <SelectItem value="ABSENT">Absent</SelectItem>
                                                            <SelectItem value="PASSED">Réussite</SelectItem>
                                                            <SelectItem value="FAILED">Échec</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Input
                                                        className="h-8 w-20 text-xs font-mono"
                                                        placeholder="Score"
                                                        defaultValue={reg.score || ""}
                                                        onBlur={(e) => handleUpdateStatus(reg.id, reg.status, e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className={reg.billingStatus === 'INVOICED' ? 'text-emerald-600' : 'text-orange-600'}>
                                                            {reg.billingStatus === 'INVOICED' ? 'Facturé' : 'À Facturer'}
                                                        </Badge>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Modal: Create Session */}
            <Modal isOpen={isSessionModalOpen} onClose={() => setIsSessionModalOpen(false)} title="Programmer une nouvelle session d'examen">
                <form onSubmit={handleCreateSession} className="space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                        {/* Column 1 */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Date de l'examen</label>
                                <Input type="date" name="date" required className="h-11" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Heure de l'examen</label>
                                <Input type="time" name="time" defaultValue="10:00" required className="h-11" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Intitulé de l'examen</label>
                                <Select name="examId" required>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Sélectionnez..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {exams.map(exam => (
                                            <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Nb min de candidats</label>
                                <Input type="number" name="minSpots" defaultValue="1" required className="h-11" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Nb max de candidats</label>
                                <Input type="number" name="totalSpots" defaultValue="10" required className="h-11" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Centre d'examen</label>
                                <Select name="location" required>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Choisir un centre agréé..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {agencies.filter(a => a.isExamCenter).map(agency => (
                                            <SelectItem key={agency.id} value={agency.name}>
                                                {agency.name} ({agency.city})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase italic">Agence concernée</label>
                                <Select name="agencyId">
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Réseau (Toutes Agences)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Réseau (Toutes Agences)</SelectItem>
                                        {agencies.map(agency => (
                                            <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <div className="space-y-1 max-w-[200px]">
                            <label className="text-xs font-bold text-blue-600 uppercase">Tarif / Candidat (€ HT)</label>
                            <Input type="number" name="priceHt" step="0.01" placeholder="80.00" required className="h-11 border-blue-100 bg-blue-50/30" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsSessionModalOpen(false)}>Annuler</Button>
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 h-11 px-8 font-black">
                            {isLoading ? 'Création...' : 'Valider la Session'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Inscription d'un apprenant */}
            <Modal
                isOpen={isRegisterModalOpen}
                onClose={() => {
                    setIsRegisterModalOpen(false);
                    setSelectedLearner(null);
                    setSearchTerm("");
                }}
                title={`Inscrire un candidat - ${selectedSession?.exam?.name}`}
            >
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mb-6 flex items-start gap-3">
                    <GraduationCap className="text-blue-600 mt-1" />
                    <p className="text-sm text-blue-700">
                        Cette inscription générera une ligne de facturation de <span className="font-bold">{selectedSession?.priceHt}€ HT</span> rattachée à la franchise de l'apprenant.
                    </p>
                </div>

                {!selectedLearner ? (
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <Input
                                placeholder="Rechercher par nom, email ou n° de dossier..."
                                className="pl-10 h-11"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {eligibleLearners.length > 0 ? (
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                                {eligibleLearners.map(learner => (
                                    <button
                                        key={learner.id}
                                        onClick={() => setSelectedLearner(learner)}
                                        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                                    >
                                        <div>
                                            <p className="font-bold text-slate-900">{learner.firstName} {learner.lastName}</p>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span>{learner.email}</span>
                                                <span>•</span>
                                                <span className="font-mono text-blue-600 bg-blue-50 px-1.5 rounded">{learner.folders?.[0]?.externalFileId || 'Pas de dossier'}</span>
                                                <span>•</span>
                                                <span>{learner.agency?.name}</span>
                                            </div>
                                        </div>
                                        <Plus size={18} className="text-blue-600" />
                                    </button>
                                ))}
                            </div>
                        ) : searchTerm.length >= 2 && (
                            <div className="py-8 text-center text-slate-400">
                                <Users size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Aucun apprenant éligible trouvé pour "{searchTerm}"</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleRegisterLearner} className="space-y-6">
                        {/* Selected Learner Info */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center font-black text-blue-600 border border-slate-200">
                                    {selectedLearner.firstName[0]}{selectedLearner.lastName[0]}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">{selectedLearner.firstName} {selectedLearner.lastName}</p>
                                    <p className="text-xs text-slate-500">{selectedLearner.email}</p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLearner(null)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                                <X size={16} />
                            </Button>
                        </div>

                        {/* Additional Fields from Screenshots */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase italic">Motivation</label>
                                <Input name="motivation" placeholder="ex: Naturalisation" required className="h-11" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase italic">N° de CNI / Passport</label>
                                <Input name="idNumber" placeholder="99XXXXXXX" required className="h-11" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase italic">Langue maternelle</label>
                                <Input name="nativeLanguage" defaultValue={selectedLearner.nativeLanguage || ""} placeholder="Français, Arabe..." required className="h-11" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase italic">Pièce d'identité</label>
                                <div className="h-11 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400 bg-slate-50/50">
                                    Glissez le fichier ici (.pdf, .jpg)
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setSelectedLearner(null)}
                            >
                                Retour
                            </Button>
                            <Button
                                type="submit"
                                disabled={isRegistering}
                                className="bg-blue-600 hover:bg-blue-700 h-11 px-8 font-black"
                            >
                                {isRegistering ? 'Inscription...' : 'Valider l\'inscription'}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
