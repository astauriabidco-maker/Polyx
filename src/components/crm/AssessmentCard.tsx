'use client';

import { useState } from 'react';
import { Lead } from '@/domain/entities/lead';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GraduationCap, Copy, CheckCircle2, Loader2, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { createAssessmentSessionAction } from '@/application/actions/assessment.actions';
import { CefrLevel } from '@prisma/client';
import { toast } from 'sonner';

interface AssessmentCardProps {
    lead: Lead;
    onUpdate: (lead: Lead) => void;
}

export function AssessmentCard({ lead, onUpdate }: AssessmentCardProps) {
    // Get latest session
    const session = lead.assessmentSessions?.[0]; // Assuming ordered DESC

    const [isCreating, setIsCreating] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [targetLevel, setTargetLevel] = useState<CefrLevel>(CefrLevel.A2);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);

    const handleCreate = async () => {
        setIsCreating(true);
        try {
            const res = await createAssessmentSessionAction(lead.id, targetLevel);
            if (res.success && res.data) {
                const link = `${window.location.protocol}//${window.location.host}/test/${res.data.token}`;
                setGeneratedLink(link);
                // We should also update local lead state to reflect PENDING session immediately if possible
                // For now, onUpdate might need to receive the new session in correct format
                // Or we rely on the link modal to advise user. 
                // Ideally, onUpdate should reload the lead or we optimistically update.
                toast.success("Session de test créée avec succès !");
            } else {
                toast.error("Erreur lors de la création.");
            }
        } catch (e) {
            toast.error("Erreur technique");
        } finally {
            setIsCreating(false);
        }
    };

    const copyLink = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink);
            toast.success("Lien copié !");
            setShowModal(false);
            // In a real app, Trigger reload to show "Pending" state
        }
    };

    if (session && session.status === 'COMPLETED') {
        const score = session.score || 0;
        const level = session.calculatedLevel || 'A1';
        const target = session.targetLevel || 'B1';
        const hours = session.recommendedHours || 0;

        return (
            <Card className="border-green-100 bg-green-50/20 overflow-hidden relative shadow-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-100 rounded-bl-full -mr-10 -mt-10 opacity-50" />
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-green-800 flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-green-600" />
                        Test Terminé
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-xs text-green-600 uppercase font-semibold">Niveau Atteint</p>
                            <p className="text-4xl font-black text-green-900">{level}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-green-600 uppercase font-semibold">Score Global</p>
                            <p className="text-2xl font-bold text-green-700">{score}%</p>
                        </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-green-100 shadow-sm mb-4">
                        <div className="flex items-start gap-3">
                            <Sparkles size={18} className="text-indigo-500 mt-1 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Gap Analysis</p>
                                <p className="text-sm text-slate-700 mb-1">
                                    Objectif : <span className="font-bold">{target}</span>
                                </p>
                                <p className="text-lg font-black text-indigo-700">
                                    Recommandation : {hours} Heures de formation
                                </p>
                            </div>
                        </div>
                    </div>

                    <Button
                        className="w-full bg-white border border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 font-medium"
                        size="sm"
                        onClick={() => window.open(`/api/assessment/${session.token}/pdf`, '_blank')}
                    >
                        <FileText size={16} className="mr-2" /> Télécharger Attestation PDF
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (session && session.status === 'PENDING') {
        return (
            <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-amber-800 flex items-center gap-2">
                        <AlertCircle size={18} className="text-amber-600" />
                        En attente du candidat
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            readOnly
                            value={`${window.location.protocol}//${window.location.host}/test/${session.token}`}
                            className="flex-1 text-xs bg-white border border-amber-200 rounded p-2 text-slate-600 focus:outline-none"
                        />
                        <Button size="sm" variant="outline" className="h-8 border-amber-200 text-amber-700 hover:bg-amber-100" onClick={() => {
                            navigator.clipboard.writeText(`${window.location.protocol}//${window.location.host}/test/${session.token}`);
                            toast.success("Lien copié !");
                        }}>
                            <Copy size={14} />
                        </Button>
                    </div>
                    <p className="text-xs text-amber-600 italic">
                        Le candidat doit effectuer le test pour débloquer la recommandation.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Default: No Test
    return (
        <Card className="border-slate-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <GraduationCap size={18} className="text-indigo-500" />
                    Test de Positionnement
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-slate-500 mb-4"> Aucun test n'a été effectué pour ce lead.</p>

                <Dialog open={showModal} onOpenChange={setShowModal}>
                    <DialogTrigger asChild>
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" size="sm">
                            Générer un Test
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Générer un Test de Positionnement</DialogTitle>
                            <DialogDescription>
                                Choisissez l'objectif cible pour adapter la difficulté du test.
                            </DialogDescription>
                        </DialogHeader>

                        {!generatedLink ? (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Objectif Visé</label>
                                    <Select value={targetLevel} onValueChange={(v) => setTargetLevel(v as CefrLevel)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="A1">A1 - Débutant</SelectItem>
                                            <SelectItem value="A2">A2 - Élémentaire (Nationalité)</SelectItem>
                                            <SelectItem value="B1">B1 - Intermédiaire</SelectItem>
                                            <SelectItem value="B2">B2 - Avancé</SelectItem>
                                            <SelectItem value="C1">C1 - Expert</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ) : (
                            <div className="py-6 text-center">
                                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="text-green-600" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 mb-2">Lien généré !</h3>
                                <div className="p-3 bg-slate-50 border rounded text-xs text-slate-500 break-all mb-4">
                                    {generatedLink}
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            {!generatedLink ? (
                                <Button onClick={handleCreate} disabled={isCreating}>
                                    {isCreating && <Loader2 className="mr-2 animate-spin" />}
                                    Créer la session
                                </Button>
                            ) : (
                                <Button onClick={copyLink} className="w-full">
                                    <Copy size={16} className="mr-2" /> Copier le lien
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}

