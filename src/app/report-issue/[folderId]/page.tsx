'use client';

import { useState, use } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Send, CheckCircle2, ShieldAlert } from 'lucide-react';
import { createComplaintAction } from '@/application/actions/quality.actions';
import { useToast } from '@/components/ui/use-toast';

export default function ReportIssuePage({ params }: { params: Promise<{ folderId: string }> }) {
    const { folderId } = use(params);
    const { toast } = useToast();

    const [type, setType] = useState("PEDAGOGIQUE");
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!subject || !content) {
            toast({ title: "Champs requis", description: "Veuillez remplir tous les champs.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        const res = await createComplaintAction({
            folderId,
            type,
            subject,
            content,
            priority: "MEDIUM"
        });

        if (res.success) {
            setIsSuccess(true);
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md border-none shadow-2xl rounded-3xl p-12 text-center animate-in zoom-in-50 duration-500">
                    <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-6">
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2 italic tracking-tight">Signalement Reçu</h2>
                    <p className="text-slate-500 mb-0 leading-relaxed">
                        Votre réclamation a été transmise à notre responsable qualité. Nous reviendrons vers vous sous 48h (Indicateur 34 - Qualiopi).
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 font-sans">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 bg-rose-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">P</div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">Espace <span className="text-rose-600">Qualité</span></h1>
            </div>

            <Card className="w-full max-w-lg border-none shadow-2xl rounded-3xl overflow-hidden">
                <div className="bg-rose-600 p-8 text-white">
                    <h2 className="text-3xl font-black italic tracking-tighter">Signaler une difficulté</h2>
                    <p className="text-rose-100 text-sm mt-1">Nous mettons tout en œuvre pour améliorer votre expérience.</p>
                </div>

                <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Type de difficulté</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-sm font-bold"
                        >
                            <option value="PEDAGOGIQUE">Pédagogique (Contenu, Formateur)</option>
                            <option value="TECHNIQUE">Technique (Accès plateforme, Zoom)</option>
                            <option value="ADMINISTRATIF">Administratif (Dossier, CPF, Facture)</option>
                            <option value="AUTRE">Autre raison</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Sujet</label>
                        <input
                            type="text"
                            placeholder="Ex: Problème d'accès au module 3"
                            className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-rose-500"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Message détaillé</label>
                        <textarea
                            rows={5}
                            className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm outline-rose-500"
                            placeholder="Veuillez décrire votre situation avec précision..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    <div className="pt-4">
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-lg font-black italic rounded-xl shadow-xl shadow-rose-100 gap-2 transition-all hover:scale-[1.02]"
                        >
                            {isSubmitting ? 'Transmission...' : <>
                                <span>Envoyer ma réclamation</span>
                                <Send size={20} />
                            </>}
                        </Button>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <ShieldAlert className="text-slate-400 mt-1 shrink-0" size={18} />
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                            En soumettant ce formulaire, une procédure de traitement des réclamations est enclenchée conformément à l'Indicateur 34 du référentiel Qualiopi.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
