'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/application/store/auth-store';
import { createInvoiceAction } from '@/application/actions/invoice.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { getLearnersAction } from '@/application/actions/learner.actions';

export default function NewInvoicePage() {
    const router = useRouter();
    const { activeOrganization } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [payerType, setPayerType] = useState('LEARNER');
    const [learners, setLearners] = useState<any[]>([]);
    const [selectedLearner, setSelectedLearner] = useState<string>('');
    const [payerName, setPayerName] = useState('');
    const [payerAddress, setPayerAddress] = useState('');
    const [dueDate, setDueDate] = useState('');

    const [lines, setLines] = useState<{ description: string, quantity: number, unitPrice: number, taxRate: number }[]>([
        { description: 'Formation', quantity: 1, unitPrice: 0, taxRate: 0 }
    ]);

    useEffect(() => {
        if (activeOrganization) {
            getLearnersAction(activeOrganization.id).then(res => {
                if (res.success && res.learners) setLearners(res.learners);
            })
        }
    }, [activeOrganization]);

    // Handle Learner Selection to auto-fill
    useEffect(() => {
        if (payerType === 'LEARNER' && selectedLearner) {
            const l = learners.find(l => l.id === selectedLearner);
            if (l) {
                setPayerName(`${l.firstName} ${l.lastName}`);
                setPayerAddress(l.address || '');
            }
        }
    }, [selectedLearner, payerType, learners]);

    const addLine = () => {
        setLines([...lines, { description: '', quantity: 1, unitPrice: 0, taxRate: 0 }]);
    };

    const removeLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    const updateLine = (index: number, field: string, value: any) => {
        const newLines = [...lines];
        // @ts-ignore
        newLines[index][field] = value;
        setLines(newLines);
    };

    const calculateTotal = () => {
        return lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);

        const res = await createInvoiceAction({
            organisationId: activeOrganization!.id,
            payerType: payerType as any,
            payerName,
            payerAddress,
            dueDate: new Date(dueDate),
            lines,
            // Link to folder if learner selected... (simplified logic for now)
            folderId: payerType === 'LEARNER' && selectedLearner ? learners.find(l => l.id === selectedLearner)?.folders?.[0]?.id : undefined
        });

        if (res.success) {
            router.push('/app/billing/invoices');
        } else {
            alert('Erreur: ' + res.error);
        }
        setIsLoading(false);
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 p-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ChevronLeft className="text-slate-400" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Nouvelle Facture</h1>
                    <p className="text-slate-500">Créer une facture manuelle.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. Client Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Informations Client</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type de Client</Label>
                                <Select value={payerType} onValueChange={setPayerType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LEARNER">Apprenant (Particulier)</SelectItem>
                                        <SelectItem value="COMPANY">Entreprise</SelectItem>
                                        <SelectItem value="OPCO">OPCO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {payerType === 'LEARNER' && (
                                <div className="space-y-2">
                                    <Label>Sélectionner Apprenant</Label>
                                    <Select value={selectedLearner} onValueChange={setSelectedLearner}>
                                        <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                                        <SelectContent>
                                            {learners.map(l => (
                                                <SelectItem key={l.id} value={l.id}>{l.firstName} {l.lastName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nom / Raison Sociale</Label>
                                <Input required value={payerName} onChange={e => setPayerName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Adresse</Label>
                                <Input value={payerAddress} onChange={e => setPayerAddress(e.target.value)} />
                            </div>
                        </div>

                        <div className="w-1/3 space-y-2">
                            <Label>Échéance</Label>
                            <Input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Lines */}
                <Card>
                    <CardHeader className="flex flex-row justify-between items-center">
                        <CardTitle className="text-base">Lignes de Facture</CardTitle>
                        <Button type="button" variant="outline" size="sm" onClick={addLine}>
                            <Plus size={16} className="mr-2" /> Ajouter Ligne
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {lines.map((line, index) => (
                            <div key={index} className="flex gap-4 items-end">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">Description</Label>
                                    <Input
                                        value={line.description}
                                        onChange={e => updateLine(index, 'description', e.target.value)}
                                        placeholder="Prestation..."
                                    />
                                </div>
                                <div className="w-24 space-y-1">
                                    <Label className="text-xs">Qté</Label>
                                    <Input
                                        type="number" step="0.5"
                                        value={line.quantity}
                                        onChange={e => updateLine(index, 'quantity', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="w-32 space-y-1">
                                    <Label className="text-xs">Prix Unitaire</Label>
                                    <Input
                                        type="number" step="0.01"
                                        value={line.unitPrice}
                                        onChange={e => updateLine(index, 'unitPrice', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="w-24 space-y-1">
                                    <Label className="text-xs">Total HT</Label>
                                    <div className="h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-right flex items-center justify-end">
                                        {(line.quantity * line.unitPrice).toFixed(2)} €
                                    </div>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="mb-0.5 text-red-400 hover:bg-red-50" onClick={() => removeLine(index)}>
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        ))}

                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <div className="text-right">
                                <p className="text-sm text-slate-500">Total HT</p>
                                <p className="text-2xl font-bold text-slate-900">{calculateTotal().toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={() => router.back()}>Annuler</Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 min-w-[150px]" isLoading={isLoading}>
                        Créer Facture
                    </Button>
                </div>

            </form>
        </div>
    );
}
