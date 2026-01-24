'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ChevronRight, Loader2, ArrowRight, Play } from 'lucide-react';
import { submitAssessmentAction } from '@/application/actions/assessment.actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
    id: string;
    content: string;
    choices: string[];
    level: string;
}

interface QuizRunnerProps {
    token: string;
    leadName: string;
    questions: Question[];
    targetLevel: string;
}

export function QuizRunner({ token, leadName, questions, targetLevel }: QuizRunnerProps) {
    // States: 'INTRO' | 'QUIZ' | 'FINISHED'
    const [status, setStatus] = useState<'INTRO' | 'QUIZ' | 'FINISHED'>('INTRO');

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

    const currentQuestion = questions[currentIndex];
    const progress = ((currentIndex + (status === 'FINISHED' ? 1 : 0)) / questions.length) * 100;

    const handleStart = () => {
        setStatus('QUIZ');
    };

    const handleNext = async () => {
        if (selectedChoice === null) return;

        // Save answer
        const newAnswers = { ...answers, [currentQuestion.id]: selectedChoice };
        setAnswers(newAnswers);

        // Wait a tiny bit for user to see selection feedback if we wanted, but instant is better for flow
        // Or we could delay. Let's do instant but smooth transition.

        if (currentIndex < questions.length - 1) {
            // Delay slightly to let the radio animation finish? No, immediate is snappier.
            setSelectedChoice(null);
            setCurrentIndex(prev => prev + 1);
        } else {
            await submit(newAnswers);
        }
    };

    const submit = async (finalAnswers: Record<string, number>) => {
        setIsSubmitting(true);
        try {
            const res = await submitAssessmentAction(token, finalAnswers);
            if (res.success) {
                setStatus('FINISHED');
            } else {
                toast.error(res.error || "Une erreur est survenue lors de l'envoi.");
                // Provide a specific retry button or state if needed, but for now just stay here
            }
        } catch (e) {
            toast.error("Erreur de connexion.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- VIEW: INTRO ---
    if (status === 'INTRO') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl mx-auto text-center"
            >
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Play fill="currentColor" className="ml-1" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Prêt à commencer ?</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        Ce test comporte <strong>{questions.length} questions</strong>.
                        Il nous permettra de calibrer votre programme <strong>{targetLevel}</strong>.
                        <br /><span className="text-sm text-slate-400 mt-2 block">Durée estimée : 10 minutes</span>
                    </p>
                    <Button
                        size="lg"
                        onClick={handleStart}
                        className="w-full sm:w-auto px-12 h-14 text-lg rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
                    >
                        Commencer le test
                    </Button>
                </div>
            </motion.div>
        );
    }

    // --- VIEW: FINISHED ---
    if (status === 'FINISHED') {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto text-center"
            >
                <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-green-100 shadow-lg">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    >
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                    </motion.div>
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-4">Test Terminé !</h2>
                <p className="text-slate-600 text-lg mb-8">
                    Merci {leadName}, vos réponses ont été enregistrées.
                    <br />Votre conseiller pédagogique reviendra vers vous avec votre résultat.
                </p>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-500">
                    Vous pouvez fermer cette fenêtre.
                </div>
            </motion.div>
        );
    }

    // --- VIEW: QUIZ ---
    return (
        <div className="max-w-2xl mx-auto w-full">
            {/* Header / Progress */}
            <div className="mb-8 space-y-2">
                <div className="flex justify-between text-sm font-medium text-slate-500">
                    <span>Question {currentIndex + 1} <span className="text-slate-300">/ {questions.length}</span></span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-slate-100" />
            </div>

            {/* Question Card w/ Transition */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                    <Card className="p-8 shadow-xl border-slate-200 bg-white min-h-[400px] flex flex-col justify-center relative overflow-hidden">

                        <div className="mb-0">
                            <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded inline-block mb-4">
                                Question {currentIndex + 1}
                            </span>
                            <h3 className="text-2xl font-bold text-slate-900 leading-relaxed mb-8">
                                {currentQuestion.content}
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {currentQuestion.choices.map((choice, idx) => (
                                <motion.div
                                    key={idx}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => !isSubmitting && setSelectedChoice(idx)}
                                    className={cn(
                                        "p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-4 group relative overflow-hidden",
                                        selectedChoice === idx
                                            ? "border-indigo-600 bg-indigo-50/30 shadow-md"
                                            : "border-slate-100 hover:border-indigo-200 hover:bg-slate-50 bg-white"
                                    )}
                                >
                                    <div className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                                        selectedChoice === idx
                                            ? "border-indigo-600 bg-indigo-600"
                                            : "border-slate-300 group-hover:border-indigo-400"
                                    )}>
                                        {selectedChoice === idx && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span className={cn(
                                        "text-lg font-medium",
                                        selectedChoice === idx ? "text-indigo-900" : "text-slate-700"
                                    )}>
                                        {choice}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </Card>
                </motion.div>
            </AnimatePresence>

            {/* Actions */}
            <div className="mt-8 flex justify-end">
                <Button
                    size="lg"
                    onClick={handleNext}
                    disabled={selectedChoice === null || isSubmitting}
                    className={cn(
                        "pl-8 pr-6 text-lg h-14 rounded-full transition-all shadow-lg",
                        selectedChoice !== null
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300 hover:scale-105"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    )}
                >
                    {isSubmitting ? (
                        <>Analyse en cours... <Loader2 className="ml-2 animate-spin" /></>
                    ) : currentIndex === questions.length - 1 ? (
                        <>Terminer le test <CheckCircle2 className="ml-2" /></>
                    ) : (
                        <>Suivant <ChevronRight className="ml-2" /></>
                    )}
                </Button>
            </div>
        </div>
    );
}
