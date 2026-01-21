'use client';

import { useState } from 'react';
import { Lead } from '@/domain/entities/lead';
import { chooseFinancingAction } from '@/application/actions/crm.actions';
import { CreditCard, Smartphone, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancingStepProps {
    lead: Lead;
    onUpdate: (lead: Lead) => void;
}

const ActionCard = ({ title, description, icon: Icon, onClick, colorClass, delay = 0 }: any) => (
    <div
        onClick={onClick}
        className={cn(
            "group relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white text-left",
            "animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards",
            colorClass
        )}
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className={cn("absolute top-4 right-4 p-2 rounded-full opacity-10 group-hover:opacity-20 transition-opacity", colorClass.replace('border-', 'bg-'))}>
            <Icon className={cn("w-8 h-8", colorClass.replace('border-', 'text-'))} />
        </div>
        <div className="mb-4">
            <div className={cn("inline-flex p-3 rounded-lg mb-3 shadow-sm", colorClass.replace('border-', 'bg-').replace('200', '50'))}>
                <Icon className={cn("w-8 h-8", colorClass.replace('border-', 'text-').replace('200', '600'))} />
            </div>
            <h4 className="text-xl font-bold text-slate-800 group-hover:text-black transition-colors">{title}</h4>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed font-medium">{description}</p>
        <div className="mt-4 flex items-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0">
            Sélectionner <ChevronRight className="w-4 h-4 ml-1" />
        </div>
    </div>
);

export function FinancingStep({ lead, onUpdate }: FinancingStepProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleChoice = async (type: 'CPF' | 'PERSO') => {
        setIsLoading(true);
        const res = await chooseFinancingAction(lead.id, type);
        setIsLoading(false);

        if (res.success && res.lead) {
            onUpdate(res.lead);
        }
    };

    if (isLoading) return <div className="text-center p-8 text-slate-400">Chargement...</div>;

    return (
        <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-3xl font-bold text-slate-900 mb-2">Orientation Financière</h3>
            <p className="text-slate-500 mb-10 text-lg">Sélectionnez la voie administrative adaptée au profil.</p>

            <div className="grid md:grid-cols-2 gap-6 px-4">
                <ActionCard
                    title="Financement Personnel"
                    description="Parcours accéléré. Validation d'offre et paiement direct."
                    icon={CreditCard}
                    colorClass="border-emerald-200 hover:border-emerald-500"
                    delay={100}
                    onClick={() => handleChoice('PERSO')}
                />
                <ActionCard
                    title="Dossier CPF / EDOF"
                    description="Parcours régulé. Vérification compte, test positionnement et validation CDC."
                    icon={Smartphone}
                    colorClass="border-blue-200 hover:border-blue-500"
                    delay={200}
                    onClick={() => handleChoice('CPF')}
                />
            </div>
        </div>
    );
}
