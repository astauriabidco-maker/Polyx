
import { getAssessmentSessionAction } from '@/application/actions/assessment.actions';
import { QuizRunner } from '@/components/assessment/QuizRunner';
import { Metadata } from 'next';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
    title: 'Test de Positionnement - Polyx',
    description: 'Évaluez votre niveau pour personnaliser votre formation.',
};

export default async function AssessmentPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    // Server fetch
    const res = await getAssessmentSessionAction(token);

    if (!res.success || !res.data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle size={32} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Lien invalide ou expiré</h1>
                <p className="text-slate-500 max-w-md mx-auto mb-8">
                    {res.error || "Ce lien de test ne semble plus valide. Il a peut-être déjà été utilisé."}
                </p>
                <Link href="/">
                    <Button variant="outline">Retour à l'accueil</Button>
                </Link>
            </div>
        );
    }

    const { session, questions } = res.data;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            {/* Minimal Header */}
            <header className="h-20 flex items-center justify-center border-b border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">P</div>
                    <span className="font-bold text-xl text-slate-900 tracking-tight">Polyx</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center pt-12 pb-20 px-4">
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
                        Bonjour {session.leadName},
                    </h1>
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                        Nous allons évaluer votre niveau actuel pour construire votre programme de formation
                        <span className="font-bold text-indigo-600"> {session.targetLevel}</span>.
                    </p>
                </div>

                <div className="w-full max-w-2xl px-4">
                    <QuizRunner
                        token={token}
                        leadName={session.leadName || 'Candidat'}
                        questions={questions}
                        targetLevel={session.targetLevel as string}
                    />
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-xs text-slate-400">
                &copy; {new Date().getFullYear()} Polyx Education. Tous droits réservés.
            </footer>
        </div>
    );
}
