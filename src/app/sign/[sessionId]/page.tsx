'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Fingerprint, Search, User, CheckCircle2, RotateCcw, ShieldCheck, AlertCircle } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { findLearnerForSigningAction, registerAttendanceAction } from '@/application/actions/attendance.actions';
import { useToast } from '@/components/ui/use-toast';

export default function SignSessionPage() {
    const params = useParams();
    const sessionId = params.sessionId as string;
    const { toast } = useToast();
    const router = useRouter();

    const [step, setStep] = useState(1); // 1: Search, 2: Sign, 3: Success
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [selectedLearner, setSelectedLearner] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sigCanvas = useRef<any>(null);

    useEffect(() => {
        if (searchTerm.length >= 3) {
            const timeout = setTimeout(search, 300);
            return () => clearTimeout(timeout);
        } else {
            setResults([]);
        }
    }, [searchTerm]);

    async function search() {
        setIsLoading(true);
        const res = await findLearnerForSigningAction(sessionId, searchTerm);
        if (res.success) setResults(res.learners || []);
        setIsLoading(false);
    }

    function handleSelectLearner(learner: any) {
        setSelectedLearner(learner);
        setStep(2);
    }

    function clearSignature() {
        sigCanvas.current?.clear();
    }

    async function handleSubmitSignature() {
        if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
            toast({ title: "Firma manquante", description: "Veuillez signer l'écran.", variant: "destructive" });
            return;
        }

        const signature = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');

        setIsSubmitting(true);
        const res = await registerAttendanceAction({
            sessionId,
            folderId: selectedLearner.folders[0].id,
            signature
        });

        if (res.success) {
            setStep(3);
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
        setIsSubmitting(false);
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            {/* Branding */}
            <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">P</div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Polyx <span className="text-indigo-600">Émargement</span></h1>
            </div>

            <Card className="w-full max-w-md border-none shadow-2xl rounded-3xl overflow-hidden">
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <CardHeader className="bg-white pb-4">
                            <CardTitle className="text-xl font-black text-slate-900 italic">Identifiez-vous</CardTitle>
                            <CardDescription>Entrez votre nom pour signer votre présence aujourd'hui.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <Input
                                    placeholder="Nom, Prénom ou Email..."
                                    className="pl-10 h-12 rounded-xl text-lg border-slate-200 focus:border-indigo-500 ring-0"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {isLoading ? (
                                <div className="py-8 text-center text-slate-400 italic">Recherche en cours...</div>
                            ) : results.length > 0 ? (
                                <div className="space-y-2">
                                    {results.map(learner => (
                                        <button
                                            key={learner.id}
                                            onClick={() => handleSelectLearner(learner)}
                                            className="w-full p-4 flex items-center justify-between bg-slate-50 hover:bg-indigo-50 rounded-2xl border border-slate-100 transition-all text-left group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 group-hover:scale-110 transition-transform">
                                                    {learner.firstName[0]}{learner.lastName[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{learner.firstName} {learner.lastName}</p>
                                                    <p className="text-xs text-slate-500">{learner.folders?.[0]?.trainingTitle || "Formation Polyx"}</p>
                                                </div>
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ChevronRight size={18} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : searchTerm.length >= 3 && (
                                <div className="py-8 text-center space-y-2">
                                    <AlertCircle className="mx-auto text-slate-300" size={32} />
                                    <p className="text-sm text-slate-400">Aucun résultat trouvé. Vérifiez l'orthographe.</p>
                                </div>
                            )}
                        </CardContent>
                    </div>
                )}

                {step === 2 && selectedLearner && (
                    <div className="animate-in fade-in zoom-in-95 duration-500">
                        <CardHeader className="bg-white border-b border-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                                    {selectedLearner.firstName[0]}{selectedLearner.lastName[0]}
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold text-slate-900">{selectedLearner.firstName} {selectedLearner.lastName}</CardTitle>
                                    <CardDescription>Signature numérique de présence</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Signez ci-dessous</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 overflow-hidden relative">
                                    <SignatureCanvas
                                        ref={sigCanvas}
                                        penColor='black'
                                        canvasProps={{
                                            className: 'w-full h-64 grayscale'
                                        }}
                                    />
                                    <button
                                        onClick={clearSignature}
                                        className="absolute bottom-4 right-4 h-10 w-10 bg-white shadow-lg rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors border border-slate-100"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
                                <ShieldCheck className="text-emerald-600 mt-1" size={20} />
                                <p className="text-xs text-emerald-800 leading-relaxed">
                                    En validant, je certifie être présent à la session de formation et j'accepte que ma signature numérique soit utilisée comme preuve d'exécution.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <Button
                                    onClick={handleSubmitSignature}
                                    disabled={isSubmitting}
                                    className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02]"
                                >
                                    {isSubmitting ? 'Envoi...' : 'Valider ma présence'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setStep(1)}
                                    className="h-10 text-slate-400 font-bold"
                                >
                                    Ce n'est pas moi
                                </Button>
                            </div>
                        </CardContent>
                    </div>
                )}

                {step === 3 && (
                    <div className="bg-white p-12 text-center animate-in zoom-in-50 duration-500">
                        <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-6 shadow-lg shadow-emerald-50">
                            <CheckCircle2 size={48} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2 italic tracking-tight">Merci !</h2>
                        <p className="text-slate-500 mb-8 leading-relaxed">
                            Votre présence a été enregistrée avec succès. Vous pouvez maintenant fermer cette page.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <Fingerprint size={12} />
                            Proof of Attendance • Polyx
                        </div>
                    </div>
                )}
            </Card>

            <p className="mt-8 text-xs text-slate-400">
                Propulsé par <span className="font-bold">Polyx Engine</span> • Conformité Qualiopi & CPF
            </p>
        </div>
    );
}

function ChevronRight(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m9 18 6-6-6-6" />
        </svg>
    )
}
