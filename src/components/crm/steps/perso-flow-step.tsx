'use client';

import { useState } from 'react';
import { Lead, SalesStage, ClosingData } from '@/domain/entities/lead';
import { validatePersoOfferAction, recordPersoPaymentAction } from '@/application/actions/crm.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, CreditCard, CheckCircle2 } from 'lucide-react';

interface PersoFlowStepProps {
    lead: Lead;
    onUpdate: (lead: Lead) => void;
}

export function PersoFlowStep({ lead, onUpdate }: PersoFlowStepProps) {
    const [isLoading, setIsLoading] = useState(false);

    // State for Offer
    const [amount, setAmount] = useState<number>(1490);
    const [threshold, setThreshold] = useState<number>(30);

    // State for Payment
    const [paymentAmount, setPaymentAmount] = useState<number>(0);

    // Helpers
    const currentPaid = lead.metadata?.totalPaid || 0;
    const totalAmount = lead.closingData?.trainingPriceHt || 0;
    const thresholdAmount = totalAmount * ((lead.metadata?.paymentThreshold || 30) / 100);
    const remainingToThreshold = Math.max(0, thresholdAmount - currentPaid);

    const handleValidateOffer = async () => {
        setIsLoading(true);
        const res = await validatePersoOfferAction(lead.id, amount, threshold);
        setIsLoading(false);
        if (res.success && res.lead) onUpdate(res.lead);
    };

    const handleRecordPayment = async () => {
        setIsLoading(true);
        const res = await recordPersoPaymentAction(lead.id, paymentAmount);
        setIsLoading(false);
        if (res.success && res.lead) onUpdate(res.lead);
    };

    // --- SCREEN 1: OFFER & INVOICE ---
    if (lead.salesStage === SalesStage.OFFRE_COMMERCIALE) {
        return (
            <div className="max-w-xl mx-auto space-y-6 text-center">
                <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Validation Offre Commerciale</h3>

                <div className="bg-white p-6 rounded-xl border border-slate-200 text-left space-y-4 shadow-sm">
                    <div>
                        <Label>Montant Total (TTC)</Label>
                        <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                    </div>
                    <div>
                        <Label>Seuil Acompte (%)</Label>
                        <Input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
                        <p className="text-xs text-slate-400 mt-1">Minimum requis pour inscription: {(amount * threshold / 100).toFixed(2)} €</p>
                    </div>
                </div>

                <Button
                    size="lg"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleValidateOffer}
                    disabled={isLoading}
                >
                    Générer Facture & Valider
                </Button>
            </div>
        );
    }

    // --- SCREEN 2: PAYMENT ---
    if (lead.salesStage === SalesStage.PAIEMENT) {
        return (
            <div className="max-w-xl mx-auto space-y-6 text-center">
                <div className="mx-auto w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                    <CreditCard className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Enregistrement Paiement</h3>

                <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="text-xs font-bold text-slate-500 uppercase">Total Dossier</div>
                        <div className="text-xl font-bold text-slate-900">{totalAmount} €</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="text-xs font-bold text-slate-500 uppercase">Déjà Réglé</div>
                        <div className="text-xl font-bold text-emerald-600">{currentPaid} €</div>
                    </div>
                </div>

                {remainingToThreshold > 0 && (
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg text-orange-800 text-sm font-medium">
                        ⚠️ Il manque <strong>{remainingToThreshold.toFixed(2)} €</strong> pour atteindre le seuil d'inscription ({lead.metadata?.paymentThreshold}%).
                    </div>
                )}

                <div className="bg-white p-6 rounded-xl border border-slate-200 text-left space-y-4 shadow-sm">
                    <Label>Nouveau Paiement Reçu (€)</Label>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="0.00"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        />
                        <Button onClick={handleRecordPayment} disabled={!paymentAmount || isLoading}>Enregistrer</Button>
                    </div>
                </div>
            </div>
        );
    }

    // --- SCREEN 3: SUCCESS (INSCRIT_PERSO handled in wizard normally, but fallback here) ---
    if (lead.salesStage === SalesStage.INSCRIT_PERSO) {
        return (
            <div className="text-center py-10">
                <div className="flex justify-center mb-4"><CheckCircle2 className="w-16 h-16 text-emerald-500" /></div>
                <h3 className="text-2xl font-bold text-emerald-700">Inscription Validée (Perso)</h3>
                <p className="text-slate-500">Le seuil de paiement a été atteint.</p>
            </div>
        );
    }

    return <div>Etape Inconnue (Perso)</div>;
}
