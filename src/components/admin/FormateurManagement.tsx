'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Users, Plus, FileCheck, Receipt, Calendar, ChevronRight, Loader2,
    CheckCircle2, Clock, X, Upload, Euro, AlertTriangle
} from 'lucide-react';
import {
    getFormateursAction,
    createFormateurAction,
    getFormateurInvoicesAction,
    validateFormateurDocumentAction
} from '@/application/actions/formateur.actions';

interface FormateurManagementProps {
    orgId: string;
}

export default function FormateurManagement({ orgId }: FormateurManagementProps) {
    const [formateurs, setFormateurs] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedFormateur, setSelectedFormateur] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState('formateurs');

    // Create Form State
    const [createForm, setCreateForm] = useState({
        firstName: '', lastName: '', email: '', phone: '', nda: '', hourlyRate: 30, city: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            const [formateursRes, invoicesRes] = await Promise.all([
                getFormateursAction(orgId),
                getFormateurInvoicesAction(orgId)
            ]);
            if (formateursRes.success) setFormateurs(formateursRes.data || []);
            if (invoicesRes.success) setInvoices(invoicesRes.data || []);
            setIsLoading(false);
        }
        load();
    }, [orgId]);

    const handleCreate = async () => {
        if (!createForm.firstName || !createForm.lastName || !createForm.email) return;
        setIsSubmitting(true);
        const res = await createFormateurAction({ organisationId: orgId, ...createForm });
        if (res.success) {
            setFormateurs([res.data, ...formateurs]);
            setIsCreateOpen(false);
            setCreateForm({ firstName: '', lastName: '', email: '', phone: '', nda: '', hourlyRate: 30, city: '' });
        }
        setIsSubmitting(false);
    };

    const pendingDocs = formateurs.flatMap(f => f.documents.filter((d: any) => d.status === 'PENDING'));

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-xl">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 italic tracking-tight uppercase flex items-center gap-3">
                        <Users className="text-purple-600" size={32} />
                        Gestion des Formateurs
                    </h2>
                    <p className="text-slate-500 font-bold italic">Pilotez vos intervenants externes, leurs documents et factures.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-black uppercase italic rounded-2xl px-6 py-3 shadow-lg">
                    <Plus size={18} className="mr-2" /> Nouveau Formateur
                </Button>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white/50 backdrop-blur-sm border-slate-100 shadow-sm rounded-2xl">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-xl"><Users className="text-purple-600" size={24} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formateurs</p>
                            <p className="text-2xl font-black text-slate-900">{formateurs.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/50 backdrop-blur-sm border-slate-100 shadow-sm rounded-2xl">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 rounded-xl"><CheckCircle2 className="text-emerald-600" size={24} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Validés</p>
                            <p className="text-2xl font-black text-slate-900">{formateurs.filter(f => f.isValidated).length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/50 backdrop-blur-sm border-slate-100 shadow-sm rounded-2xl">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-amber-100 rounded-xl"><FileCheck className="text-amber-600" size={24} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Docs en Attente</p>
                            <p className="text-2xl font-black text-slate-900">{pendingDocs.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/50 backdrop-blur-sm border-slate-100 shadow-sm rounded-2xl">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-xl"><Receipt className="text-blue-600" size={24} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Factures Fournisseur</p>
                            <p className="text-2xl font-black text-slate-900">{invoices.length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-white/80 border border-slate-100 rounded-2xl p-1.5 shadow-sm">
                    <TabsTrigger value="formateurs" className="rounded-xl font-bold uppercase text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                        <Users size={14} className="mr-2" /> Formateurs
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="rounded-xl font-bold uppercase text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                        <FileCheck size={14} className="mr-2" /> Documents
                    </TabsTrigger>
                    <TabsTrigger value="invoices" className="rounded-xl font-bold uppercase text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                        <Receipt size={14} className="mr-2" /> Factures
                    </TabsTrigger>
                </TabsList>

                {/* Formateurs Tab */}
                <TabsContent value="formateurs">
                    <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-12 flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Formateur</TableHead>
                                            <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Contact</TableHead>
                                            <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">NDA</TableHead>
                                            <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Taux Horaire</TableHead>
                                            <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Statut</TableHead>
                                            <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Sessions</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {formateurs.map(f => (
                                            <TableRow key={f.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedFormateur(f)}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center font-black text-purple-600">
                                                            {f.firstName.charAt(0)}{f.lastName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900">{f.firstName} {f.lastName}</p>
                                                            <p className="text-xs text-slate-400">{f.city || 'Ville N/A'}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="text-sm text-slate-600">{f.email}</p>
                                                    <p className="text-xs text-slate-400">{f.phone || 'N/A'}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm font-mono text-slate-600">{f.nda || '—'}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-bold text-slate-900">{f.hourlyRate} €/h</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={`uppercase text-[9px] font-black italic border-0 ${f.isValidated ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                        {f.isValidated ? 'Validé' : 'En Attente'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm font-bold text-slate-600">{f._count?.sessions || 0}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <ChevronRight size={18} className="text-slate-300" />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents">
                    <Card className="border-slate-100 shadow-sm rounded-3xl">
                        <CardHeader>
                            <CardTitle className="text-lg font-black uppercase italic text-slate-800">Documents en Attente de Validation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pendingDocs.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <CheckCircle2 size={48} className="mx-auto mb-4 opacity-30" />
                                    <p className="font-bold">Aucun document en attente</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pendingDocs.map((doc: any) => {
                                        const formateur = formateurs.find(f => f.id === doc.formateurId);
                                        return (
                                            <div key={doc.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-amber-100 rounded-xl"><FileCheck className="text-amber-600" size={20} /></div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{doc.type} - {doc.fileName}</p>
                                                        <p className="text-xs text-slate-400">Formateur: {formateur?.firstName} {formateur?.lastName}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl" onClick={() => validateFormateurDocumentAction(doc.id, false, 'Non conforme')}>
                                                        <X size={14} className="mr-1" /> Refuser
                                                    </Button>
                                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl" onClick={() => validateFormateurDocumentAction(doc.id, true)}>
                                                        <CheckCircle2 size={14} className="mr-1" /> Valider
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Invoices Tab */}
                <TabsContent value="invoices">
                    <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">N° Facture</TableHead>
                                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Formateur</TableHead>
                                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Heures</TableHead>
                                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Montant</TableHead>
                                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Statut</TableHead>
                                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Échéance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.map(inv => (
                                        <TableRow key={inv.id}>
                                            <TableCell className="font-mono font-bold text-slate-900">{inv.number}</TableCell>
                                            <TableCell>{inv.formateur?.firstName} {inv.formateur?.lastName}</TableCell>
                                            <TableCell>{inv.hoursWorked}h</TableCell>
                                            <TableCell className="font-bold text-slate-900">{inv.totalAmount.toFixed(2)} €</TableCell>
                                            <TableCell>
                                                <Badge className={`uppercase text-[9px] font-black italic border-0 ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-600' :
                                                        inv.status === 'VALIDATED' ? 'bg-blue-100 text-blue-600' :
                                                            'bg-amber-100 text-amber-600'
                                                    }`}>
                                                    {inv.status === 'PAID' ? 'Payée' : inv.status === 'VALIDATED' ? 'Validée' : 'En Attente'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-500">{new Date(inv.dueDate).toLocaleDateString('fr-FR')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Create Formateur Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-lg bg-white/95 backdrop-blur-xl border-slate-200 rounded-3xl p-8 shadow-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 rounded-2xl text-white bg-purple-600 shadow-lg"><Plus size={24} /></div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 italic tracking-tight uppercase">Nouveau Formateur</DialogTitle>
                                <DialogDescription className="text-slate-500 font-medium">Créer un profil pour un intervenant externe.</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Prénom</label>
                                <Input value={createForm.firstName} onChange={e => setCreateForm({ ...createForm, firstName: e.target.value })} className="rounded-xl" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nom</label>
                                <Input value={createForm.lastName} onChange={e => setCreateForm({ ...createForm, lastName: e.target.value })} className="rounded-xl" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email</label>
                            <Input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} className="rounded-xl" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Téléphone</label>
                                <Input value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} className="rounded-xl" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Ville</label>
                                <Input value={createForm.city} onChange={e => setCreateForm({ ...createForm, city: e.target.value })} className="rounded-xl" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">NDA</label>
                                <Input value={createForm.nda} onChange={e => setCreateForm({ ...createForm, nda: e.target.value })} className="rounded-xl" placeholder="Numéro de Déclaration" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Taux Horaire (€)</label>
                                <Input type="number" value={createForm.hourlyRate} onChange={e => setCreateForm({ ...createForm, hourlyRate: parseFloat(e.target.value) })} className="rounded-xl" />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-8">
                        <Button onClick={handleCreate} disabled={isSubmitting || !createForm.firstName || !createForm.lastName || !createForm.email} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-6 rounded-2xl italic shadow-lg uppercase">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" size={18} />}
                            Créer le Formateur
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
