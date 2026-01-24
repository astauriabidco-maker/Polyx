'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, FileSignature, Lock, Loader2, Info } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import {
    saveProviderLegalDetailsAction,
    initiateOnboardingAction,
    finalizeOnboardingAction
} from '@/application/actions/api-provider.onboarding.actions';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Provider {
    id: string;
    organisationId: string; // Needed for Yousign service lookup
    name: string;
    siret?: string | null;
    legalName?: string | null;
    address?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    legalStatus?: string | null;
    status: string; // DRAFT, PENDING_SIGNATURE, ACTIVE
    apiKey?: string | null;
}

interface ProviderOnboardingModalProps {
    provider: Provider;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function ProviderOnboardingModal({ provider, isOpen, onClose, onUpdate }: ProviderOnboardingModalProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'legal' | 'contract' | 'final'>(
        provider.status === 'PENDING_SIGNATURE' ? 'contract' :
            provider.status === 'ACTIVE' ? 'final' : 'legal'
    );

    // Form Data
    const [formData, setFormData] = useState({
        legalName: provider.legalName || provider.name || '',
        siret: provider.siret || '',
        address: provider.address || '',
        contactName: provider.contactName || '',
        contactEmail: provider.contactEmail || '',
        legalStatus: provider.legalStatus || 'SAS'
    });

    // Revealed Key
    const [revealedKey, setRevealedKey] = useState<string | null>(null);

    async function handleSaveLegal() {
        if (!formData.legalName || !formData.siret || !formData.contactEmail) {
            toast({ title: "Erreur", description: "Veuillez remplir les champs obligatoires (*)", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        const res = await saveProviderLegalDetailsAction(provider.id, formData);
        setIsLoading(false);

        if (res.success) {
            toast({ title: "Succès", description: "Informations légales enregistrées." });
            setStep('contract');
            onUpdate();
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
    }

    async function handleInitiateSignature() {
        setIsLoading(true);
        const res = await initiateOnboardingAction(provider.id, provider.organisationId);
        setIsLoading(false);

        if (res.success) {
            toast({ title: "Contrat généré", description: "La procédure de signature Yousign a été lancée." });
            onUpdate();
            onClose(); // Close to let them check email, or stay? Stay is better but need polling.
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
    }

    async function handleVerifySignature() {
        setIsLoading(true);
        const res = await finalizeOnboardingAction(provider.id, provider.organisationId);
        setIsLoading(false);

        if (res.success) {
            toast({ title: "Félicitations !", description: "Le prestataire est maintenant actif." });
            setRevealedKey(res.apiKey);
            setStep('final');
            onUpdate();
        } else {
            toast({ title: "Non signé", description: res.error, variant: "destructive" });
        }
    }

    const isReadOnly = provider.status === 'ACTIVE';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Onboarding : {provider.name}
                        {provider.status === 'DRAFT' && <Badge variant="secondary">Brouillon</Badge>}
                        {provider.status === 'PENDING_SIGNATURE' && <Badge className="bg-orange-100 text-orange-700">Signature en cours</Badge>}
                        {provider.status === 'ACTIVE' && <Badge className="bg-emerald-100 text-emerald-700">Actif</Badge>}
                    </DialogTitle>
                    <DialogDescription>
                        Suivez les étapes pour valider le prestataire et générer ses accès.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {/* STEPPER VISUALIZATION */}
                    <div className="flex items-center justify-between mb-8 px-8 relative">
                        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-slate-100 -z-10" />

                        <div className={`flex flex-col items-center gap-2 ${step === 'legal' ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'legal' ? 'bg-blue-100' : 'bg-slate-100'}`}>1</div>
                            <span className="text-xs">Identité</span>
                        </div>
                        <div className={`flex flex-col items-center gap-2 ${step === 'contract' ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'contract' ? 'bg-blue-100' : 'bg-slate-100'}`}>2</div>
                            <span className="text-xs">Contrat</span>
                        </div>
                        <div className={`flex flex-col items-center gap-2 ${step === 'final' ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'final' ? 'bg-blue-100' : 'bg-slate-100'}`}>3</div>
                            <span className="text-xs">Accès</span>
                        </div>
                    </div>

                    {/* STEP 1: LEGAL INFO */}
                    {step === 'legal' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Raison Sociale *</Label>
                                    <Input
                                        value={formData.legalName}
                                        onChange={e => setFormData({ ...formData, legalName: e.target.value })}
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Forme Juridique</Label>
                                    <Select
                                        value={formData.legalStatus}
                                        onValueChange={v => setFormData({ ...formData, legalStatus: v })}
                                        disabled={isReadOnly}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SAS">SAS</SelectItem>
                                            <SelectItem value="SARL">SARL</SelectItem>
                                            <SelectItem value="EI">Entreprise Individuelle</SelectItem>
                                            <SelectItem value="AUTRE">Autre</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>SIRET *</Label>
                                <Input
                                    value={formData.siret}
                                    onChange={e => setFormData({ ...formData, siret: e.target.value })}
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Adresse du Siège</Label>
                                <Input
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    disabled={isReadOnly}
                                />
                            </div>

                            <hr className="border-slate-100 my-2" />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nom du Signataire *</Label>
                                    <Input
                                        value={formData.contactName}
                                        onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                        placeholder="Prénom Nom"
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email du Signataire *</Label>
                                    <Input
                                        value={formData.contactEmail}
                                        onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                                        placeholder="email@provider.com"
                                        type="email"
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 gap-2">
                                <Button variant="ghost" onClick={onClose}>Fermer</Button>
                                <Button onClick={handleSaveLegal} disabled={isLoading}>
                                    {isLoading && <Loader2 className="animate-spin mr-2" />}
                                    Suivant : Générer le contrat
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CONTRACT */}
                    {step === 'contract' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <Alert className="bg-blue-50 border-blue-100">
                                <FileSignature className="h-4 w-4 text-blue-600" />
                                <AlertTitle>Contrat de Traitement des Données (DPA)</AlertTitle>
                                <AlertDescription>
                                    Un contrat sera généré automatiquement avec les informations saisies et envoyé par email via Yousign.
                                </AlertDescription>
                            </Alert>

                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Document :</span>
                                    <span className="font-medium">DPA_Polyx_{provider.name}.pdf</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Signataire :</span>
                                    <span className="font-medium">{formData.contactName} ({formData.contactEmail})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Statut :</span>
                                    <span className="font-medium">
                                        {provider.status === 'PENDING_SIGNATURE' ? 'En attente de signature' : 'Prêt à envoyer'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <div className="flex gap-2">
                                    <Button variant="ghost" onClick={() => setStep('legal')} disabled={provider.status !== 'DRAFT'}>
                                        Retour
                                    </Button>
                                    <Button variant="ghost" onClick={onClose}>
                                        Fermer
                                    </Button>
                                </div>

                                {provider.status === 'DRAFT' ? (
                                    <Button onClick={handleInitiateSignature} disabled={isLoading}>
                                        {isLoading && <Loader2 className="animate-spin mr-2" />}
                                        Envoyer pour signature
                                    </Button>
                                ) : (
                                    <Button onClick={handleVerifySignature} disabled={isLoading} variant="secondary">
                                        {isLoading && <Loader2 className="animate-spin mr-2" />}
                                        Vérifier la signature (Rafraîchir)
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: FINAL */}
                    {step === 'final' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 text-center">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Prestataire Activé !</h3>
                                <p className="text-slate-500">Le contrat a été signé et l'accès est ouvert.</p>
                            </div>

                            {revealedKey ? (
                                <div className="bg-slate-900 text-slate-50 p-6 rounded-xl mx-8 text-left space-y-2 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 opacity-10">
                                        <Lock size={100} />
                                    </div>
                                    <Label className="text-slate-400 text-xs uppercase tracking-wider">Clé API Secrète (Copiez-la maintenant)</Label>
                                    <div className="font-mono text-xl tracking-wide break-all select-all">
                                        {revealedKey}
                                    </div>
                                    <p className="text-xs text-slate-500 items-center flex gap-1">
                                        <Info size={12} /> Cette clé ne sera plus jamais affichée.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <p className="text-sm text-slate-500">La clé API est masquée.</p>
                                </div>
                            )}

                            <Button onClick={onClose} className="w-full">
                                Terminer
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
