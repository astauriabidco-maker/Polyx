'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { getInvoicesAction, deleteInvoiceAction } from '@/application/actions/invoice.actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, FileText, Download, Trash2, Edit, CreditCard, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { downloadAccountingExportAction } from '@/application/actions/accounting.actions';
import { ExportFormat } from '@/application/services/accounting-export.service';
import { useToast } from "@/components/ui/use-toast";

// ============================================
// EXPORT MODAL COMPONENT
// ============================================

function ExportModal({ orgId }: { orgId: string }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [formatKey, setFormatKey] = useState<ExportFormat>('SAGE_FEC');

    // Default to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState(format(firstDay, 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(lastDay, 'yyyy-MM-dd'));

    async function handleExport() {
        setIsLoading(true);
        const res = await downloadAccountingExportAction(orgId, formatKey, startDate, endDate);

        if (res.success && res.data) {
            // Create download link
            const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', res.filename || 'export.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({ title: "Export réussi", description: "Le fichier a été téléchargé." });
            setIsOpen(false);
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
        setIsLoading(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Download size={16} /> Export Comptable
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Export Comptable</DialogTitle>
                    <DialogDescription>
                        Générez un fichier d'écritures pour votre logiciel comptable.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Format</Label>
                        <Select value={formatKey} onValueChange={(v: any) => setFormatKey(v)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SAGE_FEC">Sage (FEC/Import)</SelectItem>
                                <SelectItem value="PENNYLANE">Pennylane</SelectItem>
                                <SelectItem value="GENERIC_CSV">CSV Générique</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Du</Label>
                        <Input
                            type="date"
                            className="col-span-3"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Au</Label>
                        <Input
                            type="date"
                            className="col-span-3"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleExport} disabled={isLoading}>
                        {isLoading ? "Génération..." : "Télécharger"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
    const { activeOrganization } = useAuthStore();
    const router = useRouter();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (activeOrganization) {
            loadInvoices();
        }
    }, [activeOrganization]);

    async function loadInvoices() {
        setIsLoading(true);
        const res = await getInvoicesAction(activeOrganization!.id);
        if (res.success && res.data) {
            setInvoices(res.data);
        }
        setIsLoading(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce brouillon ?')) return;
        const res = await deleteInvoiceAction(id);
        if (res.success) {
            loadInvoices();
        }
    }

    const filteredInvoices = invoices.filter(inv =>
        inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.payerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    function getStatusBadge(status: string) {
        switch (status) {
            case 'DRAFT': return <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">Brouillon</Badge>;
            case 'SENT': return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Envoyée</Badge>;
            case 'PAID': return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Payée</Badge>;
            case 'OVERDUE': return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">En Retard</Badge>;
            case 'CANCELLED': return <Badge variant="outline" className="bg-slate-100 text-slate-400 border-slate-200 line-through">Annulée</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <CreditCard className="text-indigo-600" />
                        Facturation Client
                    </h1>
                    <p className="text-slate-500">Gestion des factures clients B2C et B2B.</p>
                </div>
                <div className="flex gap-2">
                    {activeOrganization && <ExportModal orgId={activeOrganization.id} />}

                    <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push('/app/billing/invoices/new')}>
                        <Plus size={16} className="mr-2" />
                        Nouvelle Facture
                    </Button>
                </div>
            </header>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <Input
                        placeholder="Rechercher par numéro ou client..."
                        className="pl-10 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {/* Add Status Filter dropdown later */}
            </div>

            {/* Invoice List */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                    <div className="flex text-xs font-bold text-slate-500 uppercase tracking-wider px-4">
                        <span className="w-1/6">Numéro</span>
                        <span className="w-1/6">Date</span>
                        <span className="w-1/4">Client</span>
                        <span className="w-1/6 text-right">Montant TTC</span>
                        <span className="w-1/6 text-center">Statut</span>
                        <span className="w-1/6 text-right">Actions</span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-400">Chargement...</div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-4">
                            <FileText size={48} className="text-slate-200" />
                            <p>Aucune facture trouvée.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredInvoices.map(inv => (
                                <div key={inv.id} className="flex items-center px-4 py-3 hover:bg-slate-50 transition-colors group">
                                    <div className="w-1/6 font-medium text-slate-700">{inv.number}</div>
                                    <div className="w-1/6 text-sm text-slate-500">{format(new Date(inv.date), 'dd/MM/yyyy')}</div>
                                    <div className="w-1/4">
                                        <p className="font-medium text-slate-800 truncate">{inv.payerName}</p>
                                        <p className="text-xs text-slate-400">{inv.payerType}</p>
                                    </div>
                                    <div className="w-1/6 text-right font-bold text-slate-700">
                                        {inv.totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                    </div>
                                    <div className="w-1/6 text-center">
                                        {getStatusBadge(inv.status)}
                                    </div>
                                    <div className="w-1/6 flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/app/billing/invoices/${inv.id}`)}>
                                            <Edit size={16} className="text-slate-500" />
                                        </Button>
                                        {inv.status === 'DRAFT' && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50" onClick={() => handleDelete(inv.id)}>
                                                <Trash2 size={16} className="text-red-400" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
