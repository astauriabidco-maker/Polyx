'use client';

import { useState, use, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Star, Send, Heart, ShieldCheck, GraduationCap, Quote } from 'lucide-react';
import { submitSatisfactionSurveyAction } from '@/application/actions/quality.actions';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams } from 'next/navigation';

export default function SurveyPage({ params }: { params: Promise<{ folderId: string }> }) {
    return (
        <Suspense fallback={<div className="p-20 text-center">Chargement de l'enquête...</div>}>
            <SurveyContent params={params} />
        </Suspense>
    );
}

function SurveyContent({ params }: { params: Promise<{ folderId: string }> }) {
    const { folderId } = use(params);
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const type = (searchParams.get('type') as "HOT" | "COLD") || "HOT";

    const [rating, setRating] = useState(0);
    const [contentQuality, setContentQuality] = useState(0);
    const [pacingQuality, setPacingQuality] = useState(0);
    const [supportQuality, setSupportQuality] = useState(0);
    const [comment, setComment] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            toast({ title: "Note requise", description: "Veuillez donner une note globale.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        const res = await submitSatisfactionSurveyAction({
            folderId,
            rating,
            type, // Handle HOT or COLD
            contentQuality,
            pacingQuality,
            supportQuality,
            comment
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
                    <div className="h-24 w-24 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mx-auto mb-6">
                        <Heart size={48} fill="currentColor" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2 italic tracking-tight">Merci !</h2>
                    <p className="text-slate-500 mb-0 leading-relaxed">
                        Votre avis est précieux. Il nous aide à améliorer continuellement la qualité de nos formations.
                    </p>
                    <div className="mt-12 flex items-center justify-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        <ShieldCheck size={12} />
                        Qualiopi Compliance • Polyx Quality
                    </div>
                </Card>
            </div>
        );
    }

    const RatingStars = ({ value, onChange, label }: { value: number, onChange: (v: number) => void, label: string }) => (
        <div className="space-y-2">
            <p className="text-sm font-bold text-slate-700">{label}</p>
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => onChange(star)}
                        className={`transition-all ${star <= value ? 'text-amber-400 scale-110' : 'text-slate-200 hover:text-amber-200'}`}
                    >
                        <Star size={32} fill={star <= value ? "currentColor" : "none"} />
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
            {/* Branding */}
            <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">P</div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">Polyx <span className="text-rose-600 font-black">Satisfaction</span></h1>
            </div>

            <Card className="w-full max-w-lg border-none shadow-2xl rounded-3xl overflow-hidden">
                <div className={`${type === 'COLD' ? 'bg-slate-900' : 'bg-gradient-to-br from-indigo-600 to-indigo-900'} p-8 text-white relative h-48 flex flex-col justify-end`}>
                    <div className="absolute top-4 right-4 opacity-10">
                        <Quote size={120} />
                    </div>
                    <h2 className="text-3xl font-black italic tracking-tighter">
                        {type === 'COLD' ? 'Que devenez-vous ?' : 'Votre avis compte.'}
                    </h2>
                    <p className="text-indigo-200 text-sm mt-1">
                        {type === 'COLD' ? 'Quelques mois après, quel est votre ressenti ?' : 'Aidez-nous à transformer l\'apprentissage de demain.'}
                    </p>
                </div>

                <CardContent className="p-8 space-y-8">
                    <RatingStars
                        label={type === 'COLD' ? "Avec le recul, êtes-vous satisfait de votre formation ?" : "Quelle est votre satisfaction globale ?"}
                        value={rating}
                        onChange={setRating}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                        <RatingStars label="Qualité du contenu" value={contentQuality} onChange={setContentQuality} />
                        <RatingStars label="Rythme de formation" value={pacingQuality} onChange={setPacingQuality} />
                        <RatingStars label="Accompagnement" value={supportQuality} onChange={setSupportQuality} />
                    </div>

                    <div className="space-y-2 pt-4">
                        <label className="text-sm font-bold text-slate-700">Un commentaire, une suggestion ?</label>
                        <textarea
                            rows={4}
                            className="w-full rounded-2xl border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 bg-slate-50 p-4 text-sm"
                            placeholder="Dites-nous ce que vous avez aimé ou ce que nous pouvons améliorer..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                    </div>

                    <div className="pt-6">
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-lg font-black italic rounded-2xl shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] gap-2"
                        >
                            {isSubmitting ? 'Envoi...' : <>
                                <span>Envoyer mon avis</span>
                                <Send size={20} />
                            </>}
                        </Button>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <ShieldCheck className="text-emerald-600 mt-1 shrink-0" size={18} />
                        <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
                            Conformément à la certification Qualiopi, vos réponses sont analysées pour améliorer nos indicateurs qualité. Vos données sont traitées de manière sécurisée par Polyx Academy.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <p className="mt-8 text-xs text-slate-400">
                Propulsé par <span className="font-bold">Polyx Quality Engine</span>
            </p>
        </div>
    );
}
