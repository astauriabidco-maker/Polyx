'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ChevronLeft, Upload, CheckCircle, XCircle, Clock, AlertCircle, FileText,
    GraduationCap, AlertTriangle, Download, Award
} from "lucide-react";
import { getLearnerDetailsAction, updateLearnerAgencyAction } from "@/application/actions/learner.actions";
import { Learner, LearnerFolder, LearnerDocument, LearnerStatus } from "@/domain/entities/learner";
import { CpfProgressBar } from "@/components/learners/CpfProgressBar";
import { LearnerStatusHeader, PedagogicalStage } from "@/components/learners/LearnerStatusHeader";
import { ActionBanner } from "@/components/learners/ActionBanner";
import { StatusManager } from "@/components/learners/StatusManager";
import { updateLearnerFolderAction } from "@/application/actions/learner.actions";
import { useToast } from "@/components/ui/use-toast";
import { AttendanceCertificate } from "@/components/attendance/AttendanceCertificate";
import { useAuthStore } from "@/application/store/auth-store";
import { getAgenciesAction } from "@/application/actions/agency.actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LearnerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params); // Next.js 15+ / React 19: Unwrap params
    const { toast } = useToast();
    const { activeOrganization } = useAuthStore();
    const [learner, setLearner] = useState<Learner | null>(null);
    const [activeFolder, setActiveFolder] = useState<LearnerFolder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [agencies, setAgencies] = useState<any[]>([]);

    useEffect(() => {
        loadData();
        if (activeOrganization?.id) {
            getAgenciesAction(activeOrganization.id).then(res => {
                if (res.success && res.agencies) setAgencies(res.agencies);
            });
        }
    }, [id, activeOrganization?.id]);

    async function loadData() {
        setIsLoading(true);
        const res = await getLearnerDetailsAction(id);
        if (res.success && res.learner) {
            const l = res.learner as unknown as Learner;
            setLearner(l);
            if (l.folders && l.folders.length > 0) {
                setActiveFolder(l.folders[0]);
            }
        }
        setIsLoading(false);
    }

    if (isLoading) return <div className="p-20 text-center text-slate-400">Chargement du dossier...</div>;
    if (!learner) return <div className="p-20 text-center text-slate-400">Apprenant introuvable.</div>;

    // --- NEW UI LOGIC ---
    const currentStage = activeFolder ? getPedagogicalStage(activeFolder) : 'ONBOARDING';

    function getPedagogicalStage(folder: LearnerFolder): import("@/components/learners/LearnerStatusHeader").PedagogicalStage {
        if (folder.invoicedDate) return "CLOTURE";
        if (folder.status === 'COMPLETED') return "FACTURATION";
        if (folder.status === 'IN_TRAINING') {
            if (folder.examDate) return "EXAMEN";
            return "FORMATION";
        }
        return "ONBOARDING";
    }

    async function handleStatusUpdate(updates: Partial<LearnerFolder>) {
        if (!activeFolder) return;
        console.log("Sending Status Update:", updates);

        // Optimistic UI Update (local)
        setActiveFolder({ ...activeFolder, ...updates });

        // Server Action
        const res = await updateLearnerFolderAction(activeFolder.id, updates);

        if (res.success && res.folder) {
            // Convert Prisma Date to String/Date as needed if mismatch, but usually React State handles objects fine if consistent.
            // The server returns serialized dates potentially.
            // Best to just reload or trust the optimistic if we don't care about precise sync instantly.
            // For now, optimistic is fine.
            console.log("Updated successfully");
        } else {
            console.error("Update failed");
            // Revert or show error
        }
    }

    async function handleBannerAction(action: string) {
        if (!activeFolder) return;
        console.log("Banner Action Triggered:", action);
        let updates: Partial<LearnerFolder> = {};

        switch (action) {
            case 'START_TRAINING':
                if (!confirm("Confirmer le démarrage de la formation ?\nCela passera le statut à 'En Formation'.")) return;
                updates = { status: LearnerStatus.IN_TRAINING, actualStartDate: new Date() };
                break;
            case 'SCHEDULE_EXAM':
                const dateStr = prompt("Date de l'examen (YYYY-MM-DD) :", new Date().toISOString().split('T')[0]);
                if (!dateStr) return;
                updates = { examDate: new Date(dateStr) };
                break;
            case 'BILLING':
                if (!confirm("Confirmer la facturation ?\nCela marquera le dossier comme facturé.")) return;
                updates = { invoicedDate: new Date() };
                break;
            case 'DOCS':
                // Ideally switch tab, but for now just scroll or alert
                const tabBtn = document.querySelector('[value="admin"]') as HTMLElement;
                if (tabBtn) tabBtn.click();
                return;
        }

        await handleStatusUpdate(updates);
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">

            <div className="p-8 space-y-6 max-w-7xl mx-auto">
                {/* 1. PROFESSIONAL HEADER (Contact & Actions) */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => router.back()}>
                            <ChevronLeft className="text-slate-400" />
                        </Button>
                        <div className="h-16 w-16 bg-white rounded-full border border-slate-200 flex items-center justify-center text-xl font-bold text-indigo-600 shadow-sm">
                            {learner.firstName[0]}{learner.lastName[0]}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{learner.firstName} {learner.lastName}</h1>
                            <div className="flex items-center gap-2 text-slate-500 mt-1">
                                <span className="text-sm">{learner.email}</span>
                                <span>•</span>
                                <span className="text-sm">{learner.phone || 'Pas de téléphone'}</span>
                                <span>•</span>
                                <Select
                                    value={(learner as any).agencyId || 'none'}
                                    onValueChange={async (value) => {
                                        const agencyId = value === 'none' ? null : value;
                                        const res = await updateLearnerAgencyAction(learner.id, agencyId);
                                        if (res.success) {
                                            toast({ title: "Agence mise à jour", description: "L'apprenant a été assigné à l'agence." });
                                            loadData();
                                        } else {
                                            toast({ title: "Erreur", description: "Impossible de modifier l'agence.", variant: "destructive" });
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-7 w-auto min-w-[140px] text-xs bg-indigo-50 border-indigo-200 text-indigo-700">
                                        <SelectValue placeholder="📍 Assigner une agence" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Aucune --</SelectItem>
                                        {agencies.map(agency => (
                                            <SelectItem key={agency.id} value={agency.id}>
                                                📍 {agency.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {activeFolder && (
                        <div className="flex items-center gap-3">
                            <StatusManager
                                folder={activeFolder}
                                onUpdate={handleStatusUpdate}
                            />

                            {(() => {
                                if (activeFolder.status === 'ONBOARDING') {
                                    const isComplianceOk = activeFolder.complianceStatus === 'VALID';
                                    return (
                                        <div title={!isComplianceOk ? "Dossier administratif incomplet" : "Démarrer"}>
                                            <Button
                                                onClick={() => handleBannerAction('START_TRAINING')}
                                                className={`gap-2 ${!isComplianceOk ? 'bg-indigo-400 opacity-90' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>▶</span>
                                                    <span>Démarrer la formation</span>
                                                </div>
                                            </Button>
                                        </div>
                                    );
                                }
                                if (activeFolder.status === 'IN_TRAINING' && !activeFolder.examDate) {
                                    return (
                                        <Button variant="outline" className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50" onClick={() => handleBannerAction('SCHEDULE_EXAM')}>
                                            <div className="flex items-center gap-2">
                                                <span>📅</span>
                                                <span>Inscrire à une session</span>
                                            </div>
                                        </Button>
                                    );
                                }
                                if (activeFolder.status === 'COMPLETED' && !activeFolder.invoicedDate) {
                                    const canBill = activeFolder.fundingType !== 'CPF' || activeFolder.cpfProgressStatus === 'SERVICE_FAIT_VALIDE';
                                    return (
                                        <Button
                                            disabled={!canBill}
                                            variant="outline"
                                            className={`gap-2 ${canBill ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                                            onClick={() => canBill && handleBannerAction('BILLING')}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>💶</span>
                                                <span>{canBill ? 'Générer la facture' : 'En attente CDC'}</span>
                                            </div>
                                        </Button>
                                    );
                                }
                                return null;
                            })()}

                            <div className="flex flex-col items-end border-l pl-3 ml-1 border-slate-200">
                                <Badge variant="outline" className="text-sm px-3 py-1 bg-white border-slate-300">
                                    {activeFolder.fundingType}
                                </Badge>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. PIPELINE (Moved Inline) */}
                {activeFolder && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-2">
                        <LearnerStatusHeader
                            currentStage={currentStage}
                            className="border-none shadow-none py-4"
                        />
                    </div>
                )}

                {/* Folder Content */}
                {activeFolder ? (
                    <Tabs defaultValue="admin" className="space-y-6">
                        <TabsList className="bg-white p-1 border border-slate-200 rounded-xl shadow-sm">
                            <TabsTrigger value="admin" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                                <FileText size={16} className="mr-2" /> Administratif & Conformité
                            </TabsTrigger>
                            <TabsTrigger value="pedagogy" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                                <GraduationCap size={16} className="mr-2" /> Pédagogie & Suivi
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="admin" className="space-y-6">

                            {/* CPF Dossier - Clean layout without redundancies */}
                            {activeFolder.fundingType === 'CPF' && (
                                <>
                                    {/* CARD 1: CPF Summary + Progress Bar (Combined) */}
                                    <Card className="overflow-hidden">
                                        {/* Header Row - Key info + Amount */}
                                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-purple-200 text-xs font-medium uppercase tracking-wider">Dossier Compte Personnel de Formation</p>
                                                    <p className="text-2xl font-bold mt-1">N° {activeFolder.externalFileId || 'Non synchronisé'}</p>
                                                    <div className="flex items-center gap-4 mt-2 text-purple-100 text-sm">
                                                        <span>🏛️ {activeFolder.funderName || 'Caisse des Dépôts'}</span>
                                                        <span className="text-purple-300">|</span>
                                                        <span>🏢 OF: Polyx Formation</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-purple-200 text-xs uppercase">Montant pris en charge</p>
                                                    <p className="text-4xl font-bold">{activeFolder.trainingAmount?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Progress Bar */}
                                        <CardContent className="pt-6 pb-4">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">📊 Avancement du Dossier CDC</p>
                                            <CpfProgressBar
                                                currentStatus={activeFolder.cpfProgressStatus || activeFolder.cpfStatus}
                                                milestones={{
                                                    receivedDate: activeFolder.receivedDate,
                                                    acceptanceDate: activeFolder.acceptanceDate,
                                                    entryDeclaredDate: activeFolder.entryDeclaredDate,
                                                    exitDeclaredDate: activeFolder.exitDeclaredDate,
                                                    serviceDeclaredDate: activeFolder.serviceDeclaredDate,
                                                    serviceValidatedDate: activeFolder.serviceValidatedDate,
                                                    invoicedDate: activeFolder.invoicedDate
                                                }}
                                            />
                                        </CardContent>
                                    </Card>

                                    {/* CARD 2: Formation - Clean layout (no more Coordonnées card) */}
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-wider">🎓 Formation</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {/* Training Title - Highlighted */}
                                            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100 flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs text-indigo-600 font-medium">Intitulé de la formation</p>
                                                    <p className="text-base font-bold text-slate-900 mt-1">{activeFolder.trainingTitle || 'Non renseigné'}</p>
                                                </div>
                                                {activeFolder.actualStartDate && activeFolder.officialStartDate && new Date(activeFolder.actualStartDate) < new Date(activeFolder.officialStartDate) && (
                                                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1 px-3">
                                                        <Clock size={12} /> Début Anticipé
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Double Timeline Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Timeline 1: EDOF Official */}
                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                    <div className="flex items-center gap-2 mb-3 text-slate-600">
                                                        <FileText size={16} className="text-purple-600" />
                                                        <p className="text-xs font-bold uppercase tracking-wider">Calendrier Officiel (EDOF)</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-xs text-slate-400">Date de début</p>
                                                            <p className="text-sm font-bold text-slate-700">{activeFolder.officialStartDate ? new Date(activeFolder.officialStartDate).toLocaleDateString('fr-FR') : '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-400">Date de fin</p>
                                                            <p className="text-sm font-bold text-slate-700">{activeFolder.officialEndDate ? new Date(activeFolder.officialEndDate).toLocaleDateString('fr-FR') : '-'}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Timeline 2: Real Progress */}
                                                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                                    <div className="flex items-center gap-2 mb-3 text-indigo-600">
                                                        <GraduationCap size={16} />
                                                        <p className="text-xs font-bold uppercase tracking-wider">Suivi Réel (Pédagogie)</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-xs text-indigo-400">Début effectif</p>
                                                            <p className="text-sm font-bold text-indigo-900">{activeFolder.actualStartDate ? new Date(activeFolder.actualStartDate).toLocaleDateString('fr-FR') : '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-indigo-400">Fin estimée</p>
                                                            <p className="text-sm font-bold text-indigo-900">{activeFolder.actualEndDate ? new Date(activeFolder.actualEndDate).toLocaleDateString('fr-FR') : '-'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Other Training Details */}
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border border-slate-100 rounded-xl">
                                                <div>
                                                    <p className="text-xs text-slate-400">Lieu de formation</p>
                                                    <p className="text-sm font-medium text-slate-800">{activeFolder.trainingLocation || 'Non précisé'}</p>
                                                    {activeFolder.trainingPostalCode && <p className="text-xs text-slate-500">{activeFolder.trainingPostalCode}</p>}
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400">Durée & Rythme</p>
                                                    <p className="text-sm font-medium text-slate-800">{activeFolder.trainingDuration || 0}h • {activeFolder.weeklyIntensity || '-'}/sem</p>
                                                    <p className="text-xs text-emerald-600 font-medium">{activeFolder.remainingHours ?? activeFolder.trainingDuration}h restantes</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400">Modalité</p>
                                                    <p className="text-sm font-medium text-slate-800">Distanciel / E-learning</p>
                                                    <Badge variant="outline" className="text-[10px] bg-white mt-1 border-slate-200">Suivi synchrone</Badge>
                                                </div>
                                            </div>
                                            {/* Formateur Section */}
                                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-lg">👨‍🏫</div>
                                                    <div>
                                                        <p className="text-xs text-slate-400">Formateur assigné</p>
                                                        <p className="text-sm font-medium text-slate-800">{activeFolder.formateurId || 'Non assigné'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm">
                                                    {activeFolder.formateurNda && <span className="text-slate-500">NDA: <span className="font-mono">{activeFolder.formateurNda}</span></span>}
                                                    {activeFolder.formateurCvUrl && <a href={activeFolder.formateurCvUrl} className="text-indigo-600 hover:underline">Voir CV →</a>}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </>
                            )}


                            {/* Document List */}
                            <div className="grid gap-4">
                                {activeFolder.documents?.map(doc => (
                                    <Card key={doc.id} className="overflow-hidden group hover:border-indigo-300 transition-all">
                                        <div className="flex items-center p-4 gap-4">
                                            {/* Status Icon */}
                                            <div className={`h-10 w-10 flex items-center justify-center rounded-full shrink-0
                                                ${doc.status === 'VALID' ? 'bg-green-100 text-green-600' :
                                                    doc.status === 'MISSING' ? 'bg-slate-100 text-slate-400' :
                                                        doc.status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-600' :
                                                            'bg-red-100 text-red-600'}
                                            `}>
                                                {doc.status === 'VALID' ? <CheckCircle size={20} /> :
                                                    doc.status === 'MISSING' ? <AlertTriangle size={20} /> :
                                                        doc.status === 'PENDING_REVIEW' ? <Clock size={20} /> :
                                                            <AlertTriangle size={20} />}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-800">{doc.label}</h4>
                                                    {doc.isRequired && <Badge variant="secondary" className="text-[10px] h-5">Requis</Badge>}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5">Type: {doc.type}</p>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                {doc.fileUrl ? (
                                                    <>
                                                        <Button size="sm" variant="outline" className="h-8 gap-2">
                                                            <Download size={14} /> Voir
                                                        </Button>
                                                        {doc.status === 'PENDING_REVIEW' && (
                                                            <div className="flex gap-1">
                                                                <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700">Valider</Button>
                                                                <Button size="sm" variant="outline" className="h-8 bg-red-50 text-red-600 border-red-200 hover:bg-red-100">Rejeter</Button>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <Button size="sm" variant="outline" className="h-8 gap-2 border-dashed border-slate-300 text-slate-500 hover:border-indigo-500 hover:text-indigo-600">
                                                        <Upload size={14} /> Déposer
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="pedagogy" className="space-y-6">
                            {/* Certificate Section */}
                            <Card className="bg-indigo-900 text-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                                    <Award size={120} />
                                </div>
                                <CardContent className="p-8">
                                    <h3 className="text-xl font-bold mb-2">Clôture Administrative</h3>
                                    <p className="text-indigo-200 text-sm mb-6 max-w-md">
                                        Une fois la formation terminée et les émargements validés, vous pouvez générer l'attestation d'assiduité officielle pour le stagiaire.
                                    </p>
                                    <div className="max-w-sm">
                                        <AttendanceCertificate
                                            learner={learner}
                                            folder={activeFolder as any}
                                            organisation={{
                                                name: activeOrganization?.name || "Polyx Academy",
                                                nda: activeOrganization?.nda,
                                                city: (activeOrganization as any)?.city || "Paris"
                                            }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                <GraduationCap size={40} className="mx-auto text-slate-300 mb-4" />
                                <h3 className="font-bold text-slate-500">Suivi du Parcours</h3>
                                <p className="text-sm text-slate-400 max-w-sm mx-auto mt-2">
                                    Retrouvez ici le détail des modules suivis et la progression pédagogique de l'apprenant.
                                </p>
                                <Button variant="outline" className="mt-6">Lier au LMS</Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                ) : (
                    <div className="p-12 text-center border rounded-xl bg-white">
                        <p className="text-slate-500">Aucun dossier actif pour cet apprenant.</p>
                        <Button className="mt-4">Créer un dossier</Button>
                    </div>
                )
                }
            </div >
        </div >
    );
}
