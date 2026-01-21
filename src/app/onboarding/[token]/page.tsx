import { OnboardingForm } from '@/components/onboarding/onboarding-form';
import { db } from '@/infrastructure/mock-db';
import { notFound } from 'next/navigation';

interface OnboardingPageProps {
    params: {
        token: string;
    }
}

export default function OnboardingPage({ params }: OnboardingPageProps) {
    // In a real app this would be a db call
    const provider = db.apiProviders.find(p => p.onboardingToken === params.token);

    if (!provider) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold text-slate-800">Lien Invalide ou Expiré</h1>
                    <p className="text-slate-600">Ce lien d'invitation n'est plus valide. Veuillez contacter l'administrateur Polyx.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
            <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-600 text-white font-bold text-xl mb-3 shadow-lg shadow-indigo-500/30">
                    P
                </div>
                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Polyx Academy</h1>
                <p className="text-sm text-slate-500">Portail Partenaire</p>
            </div>

            <OnboardingForm
                token={params.token}
                providerName={provider.name}
            />

            <footer className="mt-8 text-center text-xs text-slate-400">
                &copy; {new Date().getFullYear()} Polyx Academy. Tous droits réservés.
            </footer>
        </div>
    );
}
