'use client';

import { useState } from 'react';
import { Lead, SalesStage } from '@/domain/entities/lead';
import { setCpfAccountStatusAction, validateCpfPositioningTestAction, validateCdcFileAction } from '@/application/actions/crm.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Shield, AlertCircle, Smartphone, FileText } from 'lucide-react';

interface CpfFlowStepProps {
    lead: Lead;
    onUpdate: (lead: Lead) => void;
}

export function CpfFlowStep({ lead, onUpdate }: CpfFlowStepProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [score, setScore] = useState<string>('');

    const handleAccountStatus = async (isActive: boolean) => {
        setIsLoading(true);
        const res = await setCpfAccountStatusAction(lead.id, isActive);
        setIsLoading(false);
        if (res.success && res.lead) onUpdate(res.lead);
    };

    const handleValidateTest = async () => {
        setIsLoading(true);
        const res = await validateCpfPositioningTestAction(lead.id, Number(score));
        setIsLoading(false);
        if (res.success && res.lead) onUpdate(res.lead);
    };

    const handleValidateCdc = async () => {
        setIsLoading(true);
        const res = await validateCdcFileAction(lead.id);
        setIsLoading(false);
        if (res.success && res.lead) onUpdate(res.lead);
    };

    // --- 1. VERIF COMPTE ---
    if (lead.salesStage === SalesStage.VERIFICATION_COMPTE_CPF) {
        return (
            <div className="max-w-2xl mx-auto text-center space-y-8">
                <h3 className="text-2xl font-bold text-slate-800">Vérification Accès CPF</h3>
                <p className="text-slate-500">Le prospect peut-il se connecter IMMÉDIATEMENT à son compte ?</p>

                <div className="grid gap-4 max-w-lg mx-auto">
                    <Button
                        className="w-full py-8 text-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 shadow-lg"
                        onClick={() => handleAccountStatus(true)}
                        disabled={isLoading}
                    >
                        <span className="flex items-center justify-center gap-3">
                            <CheckCircle2 className="w-6 h-6" /> OUI - Accès Confirmé
                        </span>
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full py-8 text-lg border-2 border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-700 hover:text-red-700"
                        onClick={() => handleAccountStatus(false)}
                        disabled={isLoading}
                    >
                        <span className="flex items-center justify-center gap-3">
                            <XCircle className="w-6 h-6" /> NON - Accès Impossible
                        </span>
                    </Button>
                </div>
            </div>
        );
    }

    // --- 2. GESTION INACTIF (Simple Placeholder for the loop) ---
    if (lead.salesStage === SalesStage.IDENTITE_NUMERIQUE) {
        return (
            <div className="max-w-2xl mx-auto text-center space-y-6">
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg inline-block">
                    <AlertCircle className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                    <h4 className="font-bold text-orange-800">Compte Inactif / Bloqué</h4>
                </div>
                <p className="text-slate-500">Suivez la procédure d'identité numérique ou manuelle.</p>
                {/* Simplified: allow jumping back to success for demo/speed */}
                <Button onClick={() => handleAccountStatus(true)} variant="outline">Simuler Résolution du Problème</Button>
            </div>
        );
    }

    // --- 3. TEST POSITIONNEMENT ---
    if (lead.salesStage === SalesStage.TEST_POSITIONNEMENT) {
        return (
            <div className="max-w-xl mx-auto text-center space-y-6">
                <h3 className="text-2xl font-bold text-slate-800">Test de Positionnement</h3>
                <p className="text-slate-500">Saisissez le score obtenu par le prospect.</p>

                <div className="flex gap-2 justify-center">
                    <Input
                        type="number"
                        className="w-32 text-center text-2xl font-bold"
                        placeholder="0-100"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                    />
                    <Button
                        className="bg-indigo-600 px-8"
                        onClick={handleValidateTest}
                        disabled={!score || isLoading}
                    >
                        Valider
                    </Button>
                </div>
            </div>
        );
    }

    // --- 4. VALIDATION CDC ---
    if (lead.salesStage === SalesStage.EN_ATTENTE_VALIDATION_CDC) {
        return (
            <div className="max-w-2xl mx-auto text-center space-y-8">
                <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2 animate-pulse">
                    <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">En Attente Validation CDC</h3>
                <p className="text-slate-500">Le dossier est en attente de validation sur EDOF/MCF.</p>

                <Button
                    className="w-full max-w-sm mx-auto py-6 text-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleValidateCdc}
                    disabled={isLoading}
                >
                    ✅ Confirmer Validation Manuelle
                </Button>
            </div>
        );
    }

    return <div>Etape Inconnue (CPF)</div>;
}
