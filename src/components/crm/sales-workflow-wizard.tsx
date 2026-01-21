'use client';

import { useState } from 'react';
import { Lead, SalesStage, LeadStatus, CallOutcome } from '@/domain/entities/lead';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { updateLeadAction } from '@/application/actions/lead.actions';
import { useAuthStore } from '@/application/store/auth-store';
import { CallCockpit } from '@/components/sales/call-cockpit';
import { CheckCircle2, Clock, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

// Import New Steps
import { QualificationStep } from './steps/qualification-step';
import { FinancingStep } from './steps/financing-step';
import { PersoFlowStep } from './steps/perso-flow-step';
import { CpfFlowStep } from './steps/cpf-flow-step';

interface WizardProps {
    lead: Lead;
    onUpdate: (lead: Lead) => void;
}

// --- UI HELPERS ---

const StepIndicator = ({ currentStage, fundingType }: { currentStage: SalesStage, fundingType?: string }) => {
    let progress = 0;
    let label = "Qualification";

    if (currentStage === SalesStage.FRESH) { progress = 5; label = "Nouveau Lead"; }
    else if (currentStage === SalesStage.RDV_FIXE) { progress = 10; label = "Rendez-vous"; }
    else if (currentStage === SalesStage.CHOIX_FINANCEMENT) { progress = 20; label = "Orientation"; }
    else if (currentStage === SalesStage.VERIFICATION_COMPTE_CPF) { progress = 30; label = "Vérification CPF"; }
    else if (currentStage === SalesStage.TEST_POSITIONNEMENT) { progress = 50; label = "Test / Audit"; }
    else if (currentStage === SalesStage.OFFRE_COMMERCIALE || currentStage === SalesStage.EN_ATTENTE_VALIDATION_CDC) { progress = 70; label = "Validation"; }
    else if (currentStage === SalesStage.PAIEMENT) { progress = 80; label = "Paiement"; }
    else if (currentStage === SalesStage.INSCRIPTION || currentStage === SalesStage.INSCRIT_CPF || currentStage === SalesStage.INSCRIT_PERSO) { progress = 100; label = "Terminé"; }

    return (
        <div className="w-full mb-8 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Étape : {label}</span>
                <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-slate-100" indicatorClassName={cn("bg-gradient-to-r transition-all duration-700", fundingType === 'PERSO' ? "from-emerald-400 to-emerald-600" : "from-blue-400 to-indigo-600")} />
        </div>
    );
};

const WizardCard = ({ children, className, lead }: { children: React.ReactNode, className?: string, lead: Lead }) => (
    <Card className={cn("relative overflow-hidden bg-white/80 backdrop-blur-xl border-slate-200 shadow-xl transition-all duration-500", className)}>
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-20" />
        <div className="p-8 md:p-10">
            {lead.salesStage && <StepIndicator currentStage={lead.salesStage as SalesStage} fundingType={lead.closingData?.fundingType} />}
            {children}
        </div>
    </Card>
);

// --- MAIN ORCHESTRATOR ---

export function SalesWorkflowWizard({ lead, onUpdate }: WizardProps) {
    const { activeOrganization } = useAuthStore();
    const [showCallCockpit, setShowCallCockpit] = useState(false);

    // Legacy/Simple updates still handled here or passed down if needed
    const handleUpdate = async (stage: SalesStage, dataUpdate?: any, statusUpdate?: LeadStatus) => {
        const payload: any = { salesStage: stage, closingData: { ...lead.closingData, ...dataUpdate } };
        if (statusUpdate) payload.status = statusUpdate;
        const res = await updateLeadAction(lead.id, payload);
        if (res.success && res.lead) onUpdate(res.lead);
    };

    const handleCallOutcome = (outcome: CallOutcome, data?: any) => {
        setShowCallCockpit(false);
        // Map outcome to status/stage logic roughly
        if (outcome === CallOutcome.APPOINTMENT_SET) handleUpdate(SalesStage.RDV_FIXE, { appointmentHonored: true }, LeadStatus.RDV_FIXE);
        else if (outcome === CallOutcome.NO_ANSWER) alert("Pas de réponse -> Relance prévue"); // simplistic
        // ... more logic
    };

    // --- 1. NEW / FRESH ---
    if (!lead.salesStage || lead.salesStage === SalesStage.FRESH || lead.salesStage === SalesStage.NOUVEAU) {
        return (
            <WizardCard lead={lead} className="max-w-2xl mx-auto text-center border-blue-100 bg-gradient-to-tr from-blue-50 to-white">
                <div className="mx-auto w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-bold text-slate-800 mb-2">Nouveau Lead Qualifié</h3>
                <p className="text-slate-500 text-lg mb-8 max-w-md mx-auto">
                    Ce prospect vient d'être attribué. Prêt à démarrer le traitement ?
                </p>
                <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={() => setShowCallCockpit(true)}>📞 Appeler</Button>
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg" onClick={() => handleUpdate(SalesStage.RDV_FIXE)}>
                        Démarrer le Closing <ArrowLeft className="rotate-180 ml-2 w-4 h-4" />
                    </Button>
                </div>
            </WizardCard>
        );
    }

    if (showCallCockpit) {
        return (
            <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm animate-in fade-in">
                <div className="h-full flex flex-col max-w-7xl mx-auto p-4">
                    <Button variant="ghost" className="mb-4 self-start gap-2" onClick={() => setShowCallCockpit(false)}>
                        <ArrowLeft className="w-4 h-4" /> Retour
                    </Button>
                    <div className="flex-1 border rounded-2xl overflow-hidden shadow-2xl">
                        <CallCockpit lead={{ ...lead, organizationName: 'CRM Context' } as any} onEndCall={handleCallOutcome} />
                    </div>
                </div>
            </div>
        );
    }

    // --- 2. QUALIFICATION (RDV FIXE) ---
    if (lead.salesStage === SalesStage.RDV_FIXE) {
        return <WizardCard lead={lead} className="max-w-3xl mx-auto"><QualificationStep lead={lead} onUpdate={onUpdate} /></WizardCard>;
    }

    // --- 3. FINANCEMENT ---
    if (lead.salesStage === SalesStage.CHOIX_FINANCEMENT) {
        return <WizardCard lead={lead} className="max-w-4xl mx-auto"><FinancingStep lead={lead} onUpdate={onUpdate} /></WizardCard>;
    }

    // --- 4. PERSO FLOW ---
    if ([SalesStage.OFFRE_COMMERCIALE, SalesStage.PAIEMENT, SalesStage.INSCRIT_PERSO].includes(lead.salesStage)) {
        return <WizardCard lead={lead} className="max-w-3xl mx-auto"><PersoFlowStep lead={lead} onUpdate={onUpdate} /></WizardCard>;
    }

    // --- 5. CPF FLOW ---
    // Includes verification, test, validation CDC
    if ([
        SalesStage.VERIFICATION_COMPTE_CPF,
        SalesStage.IDENTITE_NUMERIQUE,
        SalesStage.TEST_POSITIONNEMENT,
        SalesStage.EN_ATTENTE_VALIDATION_CDC,
        SalesStage.INSCRIT_CPF
    ].includes(lead.salesStage)) {
        return <WizardCard lead={lead} className="max-w-3xl mx-auto"><CpfFlowStep lead={lead} onUpdate={onUpdate} /></WizardCard>;
    }

    // Fallback
    return (
        <WizardCard lead={lead} className="text-center p-8">
            <h3 className="text-xl font-bold text-slate-400">Étape non gérée ou terminée : {lead.salesStage}</h3>
            <p className="text-slate-400">Le workflow est peut-être terminé.</p>
        </WizardCard>
    );
}

