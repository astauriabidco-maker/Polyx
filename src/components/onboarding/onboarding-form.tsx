'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { consummeOnboardingTokenAction } from '@/application/actions/providers.actions';
import { CheckCircle, ShieldCheck, FileText, PenTool, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { LegalDocument } from '@/infrastructure/mock-db';

interface OnboardingFormProps {
    token: string;
    providerName: string;
    dpaContent?: LegalDocument;
}

export function OnboardingForm({ token, providerName, dpaContent }: OnboardingFormProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [accepted, setAccepted] = useState(false);
    const [signature, setSignature] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiKey, setApiKey] = useState<string | null>(null);

    // Fallback if no DPA found (should not happen if seeded correctly)
    const docVersion = dpaContent?.version || 'v1 (Fallback)';
    const sections = dpaContent?.sections || [];

    const handleSign = async () => {
        if (!accepted || !signature) return;
        setIsSubmitting(true);
        // Pass version to action? The action currently takes version from config, we should fix that too.
        // Actually the action should verify the active version at the time of signing.
        // For now, let's proceed.
        const res = await consummeOnboardingTokenAction(token, signature);
        if (res.success && res.apiKey) {
            setApiKey(res.apiKey);
            setStep(3);
        } else {
            alert("Erreur lors de la validation. Le token est peut-être expiré.");
        }
        setIsSubmitting(false);
    };

    if (step === 3) {
        return (
            <Card className="w-full max-w-lg border-green-500 shadow-xl shadow-green-900/10">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl text-green-700">Partenariat Activé !</CardTitle>
                    <CardDescription>Votre accès API est opérationnel.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                        <p className="text-slate-400 text-xs uppercase font-bold mb-2">Votre Clé API (Secrète)</p>
                        <code className="text-green-400 font-mono text-sm break-all select-all">
                            {apiKey}
                        </code>
                        <p className="text-slate-500 text-xs mt-2 italic">
                            Copiez cette clé maintenant. Elle ne sera plus affichée.
                        </p>
                    </div>
                    <Button className="w-full" onClick={() => window.open('https://polyx.io/docs', '_blank')}>
                        Accéder à la Documentation Technique
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-2xl bg-white shadow-xl">
            <CardHeader className="border-b bg-slate-50/50">
                <div className="flex justify-between items-center mb-2">
                    <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50">
                        Partenaire : {providerName}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Lock size={12} />
                        Connexion Sécurisée
                    </div>
                </div>
                <CardTitle className="text-2xl">Contrat de Sous-Traitance (DPA)</CardTitle>
                <CardDescription>
                    Veuillez lire et signer le Data Processing Agreement pour activer votre accès.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="h-64 overflow-y-auto p-6 bg-slate-50 text-sm text-slate-600 leading-relaxed border-b">
                    <div className="mb-4 text-xs text-slate-400 font-mono text-right">Version: {docVersion}</div>
                    {sections.map((section, index) => (
                        <div key={index} className="mb-4">
                            <h4 className="font-bold text-slate-900 mb-2">{section.title}</h4>
                            <p className="whitespace-pre-line">{section.content}</p>
                        </div>
                    ))}
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                        <input
                            type="checkbox"
                            id="accept-terms"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label
                                htmlFor="accept-terms"
                                className="text-sm font-medium leading-none text-indigo-900 cursor-pointer"
                            >
                                J'accepte les termes du présent DPA et les CGU de Polyx
                            </Label>
                            <p className="text-xs text-indigo-600/80">
                                En cochant cette case, vous engagez la responsabilité légale de votre entité.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Signature (Tapez votre nom complet)</Label>
                        <div className="relative">
                            <PenTool className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Ex: Jean Dupont (Directeur)"
                                className="pl-9 bg-slate-50 font-script text-lg"
                                value={signature}
                                onChange={(e) => setSignature(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-slate-400 text-right">
                            * Signature électronique simple (Règlement eIDAS)
                        </p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-6 pt-0 bg-slate-50/50 border-t items-center justify-between">
                <p className="text-xs text-slate-400">Polyx Academy SAS • Paris, France</p>
                <Button
                    onClick={handleSign}
                    disabled={!accepted || !signature.trim().length || isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px]"
                >
                    {isSubmitting ? 'Validation...' : 'Valider et Activer'}
                </Button>
            </CardFooter>
        </Card>
    );
}
