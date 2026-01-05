'use client';

import { useState } from 'react';
import { ApiProvider } from '@/infrastructure/mock-db';
import { updateProviderAction, verifyProviderComplianceAction } from '@/application/actions/providers.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CheckCircle, ShieldAlert } from 'lucide-react';

interface ProviderDetailsFormProps {
    provider: ApiProvider;
    onClose: () => void;
}

export function ProviderDetailsForm({ provider, onClose }: ProviderDetailsFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isVerified, setIsVerified] = useState(provider.complianceStatus === 'VERIFIED');
    const [formData, setFormData] = useState({
        // ... (previous state)
        name: provider.name,
        legalName: provider.legalName || '',
        siret: provider.siret || '',
        providerType: provider.providerType || 'LEAD_GENERATOR',
        contactName: provider.contact?.name || '',
        contactEmail: provider.contact?.email || '',
        contactPhone: provider.contact?.phone || '',
    });

    const handleComplianceToggle = async (checked: boolean) => {
        if (!confirm(checked
            ? "Confirmez-vous avoir reçu et validé le contrat DPA signé par ce partenaire ?"
            : "Attention, cela suspendra immédiatement l'accès API de ce partenaire. Continuer ?")) {
            return;
        }
        setIsVerified(checked);
        await verifyProviderComplianceAction(provider.id, checked);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        // ... (existing submit logic)
        e.preventDefault();
        setIsLoading(true);

        const updates: Partial<ApiProvider> = {
            name: formData.name,
            legalName: formData.legalName,
            siret: formData.siret,
            providerType: formData.providerType as any,
            contact: {
                name: formData.contactName,
                email: formData.contactEmail,
                phone: formData.contactPhone,
                role: provider.contact?.role || 'Admin' // Preserve existing role or default
            }
        };

        await updateProviderAction(provider.id, updates);
        setIsLoading(false);
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* RGPD Compliance Section */}
            <div className={`p-4 rounded-lg border-l-4 ${isVerified ? 'bg-green-50 border-green-500' : 'bg-amber-50 border-amber-500'}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className={`text-lg font-bold flex items-center gap-2 ${isVerified ? 'text-green-800' : 'text-amber-800'}`}>
                            {isVerified ? <CheckCircle size={20} /> : <ShieldAlert size={20} />}
                            Conformité RGPD
                        </h3>
                        <p className={`text-sm mt-1 ${isVerified ? 'text-green-700' : 'text-amber-700'}`}>
                            {isVerified
                                ? "Partenaire conforme. Contrat DPA signé et validé."
                                : "En attente de régularisation. L'accès API est bloqué."}
                        </p>
                        {isVerified && provider.dpaSignedAt && (
                            <div className="mt-2 text-xs text-green-700/80">
                                <p>Validé le {new Date(provider.dpaSignedAt).toLocaleDateString()}</p>
                                {provider.dpaVersion && (
                                    <p className="font-mono mt-0.5">Version: {provider.dpaVersion}</p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="compliance-mode" className="text-xs font-semibold text-slate-500">
                                {isVerified ? 'Vérifié' : 'Non Vérifié'}
                            </Label>
                            <Switch
                                id="compliance-mode"
                                checked={isVerified}
                                onCheckedChange={handleComplianceToggle}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-900 border-b pb-2">Identité Entreprise</h3>
                {/* ... (Rest of the form remains the same) */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="legalName">Raison Sociale</Label>
                        <Input
                            id="legalName"
                            value={formData.legalName}
                            onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                            placeholder="Ex: Lead Corp SAS"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="siret">SIRET</Label>
                        <Input
                            id="siret"
                            value={formData.siret}
                            onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                            placeholder="123 456 789 00012"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="type">Type de Partenaire</Label>
                        <Select
                            value={formData.providerType}
                            onValueChange={(val) => setFormData({ ...formData, providerType: val })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="LEAD_GENERATOR">Générateur de Leads</SelectItem>
                                <SelectItem value="CALL_CENTER">Centre d'Appel</SelectItem>
                                <SelectItem value="AGENCY_PARTNER">Agence Partenaire</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-900 border-b pb-2">Contact Principal</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="cName">Nom complet</Label>
                        <Input
                            id="cName"
                            value={formData.contactName}
                            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                            placeholder="John Doe"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cEmail">Email</Label>
                        <Input
                            id="cEmail"
                            value={formData.contactEmail}
                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                            placeholder="john@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cPhone">Téléphone</Label>
                        <Input
                            id="cPhone"
                            value={formData.contactPhone}
                            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                            placeholder="06 00 00 00 00"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
            </div>
        </form>
    );
}
