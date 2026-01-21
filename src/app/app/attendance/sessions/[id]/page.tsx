
'use client';

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle,
    Clock,
    Fingerprint,
    ChevronLeft,
    Printer,
    Download,
    Calendar,
    MapPin,
    User as UserIcon,
    Building2,
    Loader2,
    Users
} from "lucide-react";
import { SignatureModal } from "@/components/attendance/SignatureModal";
import { markAttendanceAction, getSessionDetailsAction } from "@/application/actions/attendance.actions";
import { getLearnersAction } from "@/application/actions/learner.actions";
import { useToast } from "@/components/ui/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface SessionPageProps {
    params: Promise<{ id: string }>;
}

export default function SessionAttendancePage({ params }: SessionPageProps) {
    const { id: sessionId } = use(params);
    const router = useRouter();
    const { toast } = useToast();

    const [session, setSession] = useState<any>(null);
    const [learners, setLearners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const [selectedLearner, setSelectedLearner] = useState<any | null>(null);
    const [isSignatureOpen, setIsSignatureOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [sessionId]);

    async function loadData() {
        setLoading(true);
        const [sRes] = await Promise.all([
            getSessionDetailsAction(sessionId)
        ]);

        if (sRes.success && sRes.session) {
            setSession(sRes.session);

            // Re-fetch learners of the organization
            const res = await getLearnersAction(sRes.session.organisationId);
            if (res.success && res.learners) {
                const activeLearners = res.learners
                    .flatMap((l: any) => l.folders?.map((f: any) => ({ ...f, learner: l })) || [])
                    .filter((f: any) => f.status === 'IN_TRAINING' || f.status === 'COMPLETED')
                    .map((f: any) => {
                        // Check if already signed in this session
                        const log = sRes.session.attendanceLogs?.find((log: any) => log.folderId === f.id);
                        return {
                            id: f.learner.id,
                            folderId: f.id,
                            firstName: f.learner.firstName,
                            lastName: f.learner.lastName,
                            hoursUsed: f.hoursUsed || 0,
                            hasSigned: !!log,
                            signature: log?.signature
                        };
                    });
                setLearners(activeLearners);
            }
        }
        setLoading(false);
    }

    const handleSign = async (signatureData: string) => {
        if (!selectedLearner) return;

        // Calculate duration based on session times if possible, or default to 2
        const result = await markAttendanceAction({
            folderId: selectedLearner.folderId,
            signature: signatureData,
            sessionId: sessionId
        });

        if (result.success) {
            toast({
                title: "Présence validée ✅",
                description: `${selectedLearner.firstName} a bien émargé.`,
                className: "bg-green-600 text-white border-none"
            });
            loadData(); // Refresh to show signed state
        } else {
            toast({
                title: "Erreur",
                description: "Impossible d'enregistrer la signature.",
                variant: "destructive"
            });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = async () => {
        const element = document.getElementById('print-area-attendance');
        if (!element) return;

        setExporting(true);
        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff"
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Emargement_Session_${session.id.slice(-6)}.pdf`);

            toast({ title: "PDF Généré", description: "La feuille d'émargement a été téléchargée." });
        } catch (error) {
            console.error("PDF Export Error:", error);
            toast({ title: "Erreur", description: "Échec de la génération du PDF.", variant: "destructive" });
        }
        setExporting(false);
    };

    if (loading) return <div className="p-20 text-center text-indigo-600 animate-pulse font-medium">Chargement de la session...</div>;
    if (!session) return <div className="p-20 text-center text-slate-400">Session introuvable.</div>;

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 print:bg-white print:pb-0">
            {/* Header Area */}
            <div className="bg-white border-b border-slate-200 p-6 sticky top-0 z-10 print:static print:border-none">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => router.back()} className="print:hidden">
                            <ChevronLeft />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 uppercase text-[10px] font-bold tracking-wider">
                                    Feuille d'Émargement
                                </Badge>
                                <span className="text-slate-300 print:hidden">•</span>
                                <span className="text-sm font-medium text-slate-500 print:hidden">ID: {session.id.slice(-6)}</span>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900">{session.title || session.training?.title}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 print:hidden">
                        <Button variant="outline" className="gap-2" onClick={handlePrint}>
                            <Printer size={18} /> Imprimer
                        </Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-md"
                            onClick={handleExportPDF}
                            disabled={exporting}
                        >
                            {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            Exporter PDF
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-7xl mx-auto space-y-8">
                {/* Session Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:hidden">
                    <Card className="md:col-span-1 shadow-sm border-slate-200">
                        <CardHeader className="pb-3 bg-slate-50/50">
                            <CardTitle className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Building2 size={14} /> Organisme & Formateur
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div>
                                <p className="text-xs text-slate-400">OF</p>
                                <p className="text-sm font-bold text-slate-800">{session.organisation?.name}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">NDA: {session.organisation?.nda || '---'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Formateur</p>
                                <p className="text-sm font-bold text-indigo-700">{session.formateurName || "Non spécifié"}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-3 shadow-sm border-slate-200">
                        <CardHeader className="pb-3 bg-slate-50/50">
                            <CardTitle className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Calendar size={14} /> Détails de la Session
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-xs text-slate-400">Date</p>
                                    <p className="text-sm font-bold capitalize">{new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Horaires</p>
                                    <p className="text-sm font-bold">{session.startTime} - {session.endTime}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Lieu</p>
                                    <p className="text-sm font-bold">{session.location}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Stagiaires</p>
                                    <p className="text-sm font-bold">{session.attendanceLogs?.length} / {learners.length} présents</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* SIGNATURE AREA */}
                <div className="space-y-4 print:hidden">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Users size={20} className="text-indigo-600" />
                        Signature des Stagiaires
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {learners.map(learner => (
                            <Card key={learner.folderId} className={`transition-all border-slate-200 ${learner.hasSigned ? 'bg-green-50/50 border-green-200 opacity-80' : 'bg-white hover:border-indigo-300 hover:shadow-md'}`}>
                                <CardContent className="p-5 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold border
                                            ${learner.hasSigned ? 'bg-green-100 text-green-700 border-green-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}
                                        `}>
                                            {learner.firstName[0]}{learner.lastName[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">{learner.firstName} {learner.lastName}</h3>
                                            <p className="text-xs text-slate-500">Stagiaire</p>
                                        </div>
                                    </div>

                                    {learner.hasSigned ? (
                                        <div className="flex flex-col items-center text-green-600">
                                            <CheckCircle size={24} />
                                            <span className="text-[10px] font-bold uppercase mt-1">Signé</span>
                                        </div>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setSelectedLearner(learner);
                                                setIsSignatureOpen(true);
                                            }}
                                            className="h-10 w-10 rounded-full p-0 bg-slate-900 hover:bg-indigo-600"
                                        >
                                            <Fingerprint size={20} />
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* PRINT VIEW (Hidden on screen, shown on print) */}
                <div id="print-area-attendance" className="hidden print:block bg-white p-8 border border-slate-300 mt-10">
                    <div className="flex justify-between items-start mb-10 border-b-4 border-slate-900 pb-6">
                        <div>
                            <h2 className="text-indigo-700 font-black text-3xl italic">POLYX</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Academy of excellence</p>
                        </div>
                        <h3 className="font-bold text-2xl uppercase text-right">Feuille de Présence</h3>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <div className="col-span-1 p-2 bg-slate-50 border">
                            <p className="text-[10px] text-slate-500 uppercase">Organisme</p>
                            <p className="font-bold">{session.organisation?.name}</p>
                        </div>
                        <div className="col-span-1 p-2 bg-slate-50 border">
                            <p className="text-[10px] text-slate-500 uppercase">Formation</p>
                            <p className="font-bold">{session.training?.title || session.title}</p>
                        </div>
                        <div className="col-span-1 p-2 bg-slate-50 border">
                            <p className="text-[10px] text-slate-500 uppercase">Date</p>
                            <p className="font-bold">{new Date(session.date).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div className="col-span-1 p-2 bg-slate-50 border">
                            <p className="text-[10px] text-slate-500 uppercase">Formateur</p>
                            <p className="font-bold">{session.formateurName}</p>
                        </div>
                    </div>

                    <table className="w-full border-collapse border border-slate-400">
                        <thead>
                            <tr className="bg-slate-100 italic">
                                <th className="border border-slate-400 p-2 text-left w-1/4">Nom du Stagiaire</th>
                                <th className="border border-slate-400 p-2 text-center w-1/4">Matin ({session.startTime} - {session.endTime})</th>
                                <th className="border border-slate-400 p-2 text-center w-1/4">Après-midi</th>
                                <th className="border border-slate-400 p-2 text-left w-1/4">Observation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {learners.map(l => (
                                <tr key={l.folderId} className="h-20">
                                    <td className="border border-slate-400 p-2 font-bold">{l.lastName.toUpperCase()} {l.firstName}</td>
                                    <td className="border border-slate-400 p-1 text-center relative overflow-hidden">
                                        {l.signature && (
                                            <div className="absolute inset-0 flex items-center justify-center p-2">
                                                <img src={l.signature} alt="Signature" className="max-h-full max-w-full object-contain opacity-90" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="border border-slate-400"></td>
                                    <td className="border border-slate-400 p-2 text-[10px] text-slate-400 italic">Prévu: 2.00h</td>
                                </tr>
                            ))}
                            {/* Fill whitespace for Qualiopi requirements */}
                            {[...Array(Math.max(0, 10 - learners.length))].map((_, i) => (
                                <tr key={`empty-${i}`} className="h-20">
                                    <td className="border border-slate-400"></td>
                                    <td className="border border-slate-400"></td>
                                    <td className="border border-slate-400"></td>
                                    <td className="border border-slate-400"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-12 grid grid-cols-2 gap-20">
                        <div className="border border-slate-300 p-10 relative">
                            <span className="absolute top-2 left-2 text-[10px] uppercase font-bold text-slate-400">Signature du Formateur</span>
                        </div>
                        <div className="border border-slate-300 p-10 relative">
                            <span className="absolute top-2 left-2 text-[10px] uppercase font-bold text-slate-400">Cachet de l'Organisme</span>
                        </div>
                    </div>
                </div>
            </div>

            {selectedLearner && (
                <SignatureModal
                    isOpen={isSignatureOpen}
                    onClose={() => setIsSignatureOpen(false)}
                    onSign={handleSign}
                    learnerName={`${selectedLearner.firstName} ${selectedLearner.lastName}`}
                />
            )}
        </div>
    );
}
