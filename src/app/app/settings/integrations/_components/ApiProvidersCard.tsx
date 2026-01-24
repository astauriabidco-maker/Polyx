'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Server, Trash2, Edit, Save, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import {
    getApiProvidersAction,
    createApiProviderAction,
    updateApiProviderAction,
    deleteApiProviderAction
} from '@/application/actions/api-provider.actions';
import { ProviderOnboardingModal } from './ProviderOnboardingModal';

interface ApiProvider {
    id: string;
    organisationId: string;
    name: string;
    baseUrl?: string | null;
    apiKey?: string | null;
    webhookUrl?: string | null;
    isActive: boolean;
    status: string;
    createdAt?: Date;
    legalName?: string | null;
    siret?: string | null;
    address?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    legalStatus?: string | null;
}

export function ApiProvidersCard({ orgId }: { orgId?: string }) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [providers, setProviders] = useState<ApiProvider[]>([]);

    // State for Onboarding Modal
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<ApiProvider | null>(null);

    // Edit/Create State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingProvider, setEditingProvider] = useState<ApiProvider | null>(null);
    const [formData, setFormData] = useState<Partial<ApiProvider>>({
        name: '',
        baseUrl: '',
        apiKey: '',
        webhookUrl: '',
        isActive: false,
        legalName: '',
        siret: '',
        address: '',
        contactName: '',
        contactEmail: '',
        legalStatus: ''
    });

    useEffect(() => {
        if (orgId) loadProviders();
    }, [orgId]);

    async function loadProviders() {
        if (!orgId) return;
        setIsLoading(true);
        const res = await getApiProvidersAction(orgId);
        if (res.success && res.data) {
            setProviders(res.data as any); // Cast for date handling
        }
        setIsLoading(false);
    }

    function handleAddNew() {
        setEditingProvider(null);
        setFormData({
            name: '',
            baseUrl: '',
            apiKey: '',
            webhookUrl: '',
            isActive: false,
            legalName: '',
            siret: '',
            address: '',
            contactName: '',
            contactEmail: ''
        });
        setIsDialogOpen(true);
    }

    function handleEdit(provider: ApiProvider) {
        setEditingProvider(provider);
        setFormData({
            name: provider.name,
            baseUrl: provider.baseUrl || '',
            apiKey: '', // Don't show masked key
            webhookUrl: provider.webhookUrl || '',
            isActive: provider.isActive,
            legalName: provider.legalName || '',
            siret: provider.siret || '',
            address: provider.address || '',
            contactName: provider.contactName || '',
            contactEmail: provider.contactEmail || ''
        });
        setIsDialogOpen(true);
    }

    async function handleSave() {
        if (!orgId) return;
        if (!formData.name) return alert("Le nom est obligatoire");

        setIsSaving(true);

        try {
            let res;
            if (editingProvider) {
                res = await updateApiProviderAction(editingProvider.id, formData);
            } else {
                res = await createApiProviderAction({ ...formData, organisationId: orgId } as any);
            }

            if (res.success) {
                toast({ title: "Succès", description: "Prestataire enregistré." });
                setIsDialogOpen(false);
                await loadProviders();

                // If new, open onboarding immediately
                if (!editingProvider && res.data) {
                    // Fetch fresh data to get status
                    const newProvider = (await getApiProvidersAction(orgId)).data?.find((p: any) => p.id === res.data.id);
                    if (newProvider) {
                        setSelectedProvider(newProvider as any);
                        setIsOnboardingOpen(true);
                    }
                }
            } else {
                toast({ title: "Erreur", description: res.error, variant: "destructive" });
            }
        } catch (error: any) {
            console.error("Save error:", error);
            toast({ title: "Erreur inattendue", description: error.message || "Une erreur est survenue", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }

    function handleManage(provider: ApiProvider) {
        setSelectedProvider(provider);
        setIsOnboardingOpen(true);
    }





    async function handleDelete(id: string) {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce prestataire ?")) return;

        const res = await deleteApiProviderAction(id);
        if (res.success) {
            toast({ title: "Supprimé", description: "Prestataire supprimé." });
            loadProviders();
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
    }

    if (!orgId) return null;

    return (
        <Card className="border-slate-200 shadow-md overflow-hidden col-span-1 md:col-span-2 lg:col-span-3">
            <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Server className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Prestataires API & Sources de Leads</CardTitle>
                            <CardDescription className="text-slate-300 text-xs">
                                Configurez vos sources externes (Sites web, Landing pages, Partenaires)
                            </CardDescription>
                        </div>
                    </div>
                    <Button size="sm" onClick={handleAddNew} className="bg-white/10 hover:bg-white/20 text-white border-0">
                        <Plus size={16} className="mr-2" />
                        Ajouter
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
                ) : providers.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                        Aucun prestataire configuré. Cliquez sur "Ajouter" pour commencer.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Webhook URL</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {providers.map((provider) => (
                                    <TableRow key={provider.id}>
                                        <TableCell className="font-medium text-slate-900">
                                            {provider.name}
                                            {provider.baseUrl && <div className="text-xs text-slate-400 font-mono">{provider.baseUrl}</div>}
                                        </TableCell>
                                        <TableCell>
                                            {provider.isActive ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 uppercase text-[10px]">Actif</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-400 uppercase text-[10px]">Inactif</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-slate-500 max-w-[200px] truncate">
                                            {provider.webhookUrl || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleManage(provider)} className="text-xs h-7 border-slate-200">
                                                    {provider.status === 'ACTIVE' ? 'Gérer' : 'Onboarding'}
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(provider)}>
                                                    <Edit size={14} className="text-slate-600" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(provider.id)}>
                                                    <Trash2 size={14} className="text-red-400 hover:text-red-600" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            {/* CREATE/EDIT MODAL */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingProvider ? 'Modifier le prestataire' : 'Nouveau prestataire'}</DialogTitle>
                        <DialogDescription>
                            Configurez les accès API pour cette source externe.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nom du prestataire</Label>
                            <Input
                                placeholder="Ex: Landing Page Immo"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Raison Sociale</Label>
                                <Input
                                    placeholder="SARL Exemple"
                                    value={formData.legalName || ''}
                                    onChange={e => setFormData({ ...formData, legalName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>SIRET</Label>
                                <Input
                                    placeholder="123 456 789 00012"
                                    value={formData.siret || ''}
                                    onChange={e => setFormData({ ...formData, siret: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Adresse du siège</Label>
                            <Input
                                placeholder="10 Rue de la Paix, 75000 Paris"
                                value={formData.address || ''}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nom du Contact</Label>
                                <Input
                                    placeholder="Jean Dupont"
                                    value={formData.contactName || ''}
                                    onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email du Contact</Label>
                                <Input
                                    placeholder="jean@exemple.com"
                                    value={formData.contactEmail || ''}
                                    onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Base URL (Optionnel)</Label>
                            <Input
                                placeholder="https://api.partner.com"
                                value={formData.baseUrl || ''}
                                onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
                            />
                        </div>

                        {editingProvider ? (
                            <div className="space-y-2">
                                <Label>Clé API (Laisser vide pour ne pas changer)</Label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.apiKey || ''}
                                    onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-md border border-blue-100 flex items-start gap-2">
                                <span className="mt-0.5">ℹ️</span>
                                <div>
                                    <p className="font-semibold">Workflow de sécurité</p>
                                    <p>La clé API sera générée automatiquement et le prestataire activé une fois le DPA signé (étape suivante).</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Webhook URL (Pour réception de leads)</Label>
                            <Input
                                placeholder="https://..."
                                value={formData.webhookUrl || ''}
                                onChange={e => setFormData({ ...formData, webhookUrl: e.target.value })}
                            />
                        </div>

                        {editingProvider && (
                            <div className="flex items-center justify-between pt-2">
                                <Label>Statut Actif</Label>
                                <Switch
                                    checked={formData.isActive}
                                    onCheckedChange={c => setFormData({ ...formData, isActive: c })}
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {selectedProvider && (
                <ProviderOnboardingModal
                    isOpen={isOnboardingOpen}
                    onClose={() => setIsOnboardingOpen(false)}
                    provider={selectedProvider}
                    onUpdate={loadProviders}
                />
            )}
        </Card>
    );
}
