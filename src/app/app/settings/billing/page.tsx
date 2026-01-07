'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
    createInvoiceAction,
    getInvoicesAction,
    recordPaymentAction,
    getFinanceStatsAction
} from '@/application/actions/finance.actions';
import {
    getWalletDataAction,
    simulateTopUpAction
} from '@/application/actions/wallet.actions';
import {
    DollarSign, Plus, Download, FileText, CheckCircle2,
    Clock, AlertCircle, TrendingUp, CreditCard, Filter,
    Wallet, ArrowUpCircle, ArrowDownCircle, Loader2, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

export default function FinancePage() {
    const { activeOrganization, user } = useAuthStore();
    const { toast } = useToast();

    // State
    const [invoices, setInvoices] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    // Form Data
    const [newItem, setNewItem] = useState({ description: '', quantity: 1, unitPrice: 0 });
    const [invoiceData, setInvoiceData] = useState({
        payerType: 'COMPANY',
        payerName: '',
        items: [] as any[]
    });
    const [paymentData, setPaymentData] = useState({ amount: 0, method: 'TRANSFER', reference: '' });

    useEffect(() => {
        if (activeOrganization?.id) {
            loadData();
        }
    }, [activeOrganization?.id, filterStatus]);

    async function loadData() {
        setIsLoading(true);
        const [invRes, statRes] = await Promise.all([
            getInvoicesAction(activeOrganization!.id, filterStatus === 'ALL' ? undefined : filterStatus),
            getFinanceStatsAction(activeOrganization!.id)
        ]);

        if (invRes.success) setInvoices(invRes.invoices);
        if (statRes.success) setStats(statRes.stats);
        setIsLoading(false);
    }

    async function handleCreateInvoice() {
        const res = await createInvoiceAction({
            organisationId: activeOrganization!.id,
            ...invoiceData
        });

        if (res.success) {
            toast({ title: "✅ Facture créée", description: `Réf: ${res.invoice.number}` });
            setIsCreateOpen(false);
            setInvoiceData({ payerType: 'COMPANY', payerName: '', items: [] });
            loadData();
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
    }

    async function handleRecordPayment() {
        if (!selectedInvoice) return;

        const res = await recordPaymentAction({
            invoiceId: selectedInvoice.id,
            amount: paymentData.amount,
            method: paymentData.method,
            reference: paymentData.reference
        });

        if (res.success) {
            toast({ title: "✅ Paiement enregistré", description: `${paymentData.amount}€ encaissés.` });
            setIsPaymentOpen(false);
            setSelectedInvoice(null);
            loadData();
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
    }

    function addItem() {
        if (!newItem.description || newItem.unitPrice <= 0) return;
        setInvoiceData(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }));
        setNewItem({ description: '', quantity: 1, unitPrice: 0 });
    }

    return (
        <div className="space-y-6">
            {/* WALLET / CREDITS SECTION */}
            <WalletCard orgId={activeOrganization?.id} />

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">CA Facturé</p>
                                <h3 className="text-2xl font-black text-slate-900 mt-1">{stats?.totalBilled?.toLocaleString('fr-FR') || 0}€</h3>
                            </div>
                            <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                                <TrendingUp size={16} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Encaissé</p>
                                <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats?.totalPaid?.toLocaleString('fr-FR') || 0}€</h3>
                            </div>
                            <div className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                                <CheckCircle2 size={16} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Reste à Recouvrer</p>
                                <h3 className="text-2xl font-black text-amber-600 mt-1">{stats?.totalDue?.toLocaleString('fr-FR') || 0}€</h3>
                            </div>
                            <div className="h-8 w-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                                <Clock size={16} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Taux Recouvrement</p>
                                <h3 className="text-2xl font-black text-slate-900 mt-1">{Math.round(stats?.collectionRate || 0)}%</h3>
                            </div>
                            <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                                <PieChartIcon size={16} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge
                        variant={filterStatus === 'ALL' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setFilterStatus('ALL')}
                    >
                        Toutes
                    </Badge>
                    <Badge
                        variant={filterStatus === 'PAID' ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-emerald-100 hover:text-emerald-700 bg-white"
                        onClick={() => setFilterStatus('PAID')}
                    >
                        Payées
                    </Badge>
                    <Badge
                        variant={filterStatus === 'OVERDUE' ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-red-100 hover:text-red-700 bg-white"
                        onClick={() => setFilterStatus('OVERDUE')}
                    >
                        En Retard
                    </Badge>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 gap-2">
                            <Plus size={16} /> Nouvelle Facture
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Créer une Facture</DialogTitle>
                            <DialogDescription>Édition manuelle (hors flux automatique)</DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-2 gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Type Payeur</Label>
                                <select
                                    className="w-full border rounded-md p-2 text-sm"
                                    value={invoiceData.payerType}
                                    onChange={(e) => setInvoiceData({ ...invoiceData, payerType: e.target.value })}
                                >
                                    <option value="COMPANY">Entreprise</option>
                                    <option value="OPCO">OPCO</option>
                                    <option value="PARTICULIER">Particulier</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Nom Payeur</Label>
                                <Input
                                    value={invoiceData.payerName}
                                    onChange={(e) => setInvoiceData({ ...invoiceData, payerName: e.target.value })}
                                    placeholder="Ex: ACME Corp"
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                            <Label>Ajouter Ligne</Label>
                            <div className="flex gap-2">
                                <Input
                                    className="flex-1"
                                    placeholder="Désignation"
                                    value={newItem.description}
                                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                />
                                <Input
                                    type="number" className="w-20" placeholder="Qty"
                                    value={newItem.quantity}
                                    onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })}
                                />
                                <Input
                                    type="number" className="w-24" placeholder="Prix"
                                    value={newItem.unitPrice}
                                    onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) })}
                                />
                                <Button size="icon" variant="secondary" onClick={addItem}>
                                    <Plus size={16} />
                                </Button>
                            </div>

                            {invoiceData.items.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {invoiceData.items.map((item, i) => (
                                        <div key={i} className="flex justify-between text-sm bg-white p-2 border rounded">
                                            <span>{item.description} (x{item.quantity})</span>
                                            <span className="font-mono font-bold">{(item.unitPrice * item.quantity).toFixed(2)}€</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between pt-2 border-t font-bold">
                                        <span>TOTAL</span>
                                        <span>{invoiceData.items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0).toFixed(2)}€</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button onClick={handleCreateInvoice} disabled={invoiceData.items.length === 0}>Créer Facture</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Invoices List */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                        <tr>
                            <th className="p-4">Numéro</th>
                            <th className="p-4">Payeur</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Montant TTC</th>
                            <th className="p-4">Reste Dû</th>
                            <th className="p-4">Statut</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {invoices.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-500">Aucune facture trouvée</td>
                            </tr>
                        ) : invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50/50">
                                <td className="p-4 font-mono font-medium text-slate-700">{inv.number}</td>
                                <td className="p-4">
                                    <div className="font-bold text-slate-900">{inv.payerName}</div>
                                    <div className="text-xs text-slate-500">{inv.payerType}</div>
                                </td>
                                <td className="p-4 text-slate-600">
                                    {format(new Date(inv.date), 'dd/MM/yyyy')}
                                </td>
                                <td className="p-4 font-bold text-slate-900">
                                    {inv.totalAmount.toLocaleString('fr-FR')}€
                                </td>
                                <td className="p-4 font-mono text-slate-600">
                                    {inv.balanceDue > 0 ? `${inv.balanceDue.toLocaleString('fr-FR')}€` : '-'}
                                </td>
                                <td className="p-4">
                                    <StatusBadge status={inv.status} />
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    {inv.balanceDue > 0 && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1"
                                            onClick={() => {
                                                setSelectedInvoice(inv);
                                                setPaymentData({ ...paymentData, amount: inv.balanceDue });
                                                setIsPaymentOpen(true);
                                            }}
                                        >
                                            <CreditCard size={14} /> Encaisser
                                        </Button>
                                    )}
                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-100">
                                        <Download size={16} className="text-slate-400" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Payment Modal */}
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enregistrer un Paiement</DialogTitle>
                        <DialogDescription>Facture {selectedInvoice?.number}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>MontantReçu (€)</Label>
                            <Input
                                type="number"
                                value={paymentData.amount}
                                onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Mode de Paiement</Label>
                            <select
                                className="w-full border rounded-md p-2 text-sm"
                                value={paymentData.method}
                                onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                            >
                                <option value="TRANSFER">Virement Bancaire</option>
                                <option value="CHECK">Chèque</option>
                                <option value="CARD">Carte Bancaire</option>
                                <option value="CPF_AUTO">Virement CPF (Caisse Dépôts)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Référence Transaction</Label>
                            <Input
                                placeholder="ex: VIR-2026-X892"
                                value={paymentData.reference}
                                onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleRecordPayment} className="bg-emerald-600 hover:bg-emerald-700">Enregistrer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        DRAFT: "bg-slate-100 text-slate-600",
        SENT: "bg-blue-100 text-blue-700",
        PARTIAL: "bg-amber-100 text-amber-700",
        PAID: "bg-emerald-100 text-emerald-700",
        OVERDUE: "bg-red-100 text-red-700",
        CANCELLED: "bg-slate-200 text-slate-500 line-through"
    };

    // @ts-ignore
    const style = styles[status] || styles.DRAFT;

    const labels = {
        DRAFT: "Brouillon",
        SENT: "Envoyée",
        PARTIAL: "Partiel",
        PAID: "Payée",
        OVERDUE: "En Retard",
        CANCELLED: "Annulée"
    };

    // @ts-ignore
    return <Badge className={`${style} border-none shadow-none`}>{labels[status]}</Badge>;
}

function PieChartIcon({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALLET CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function WalletCard({ orgId }: { orgId?: string }) {
    const [isLoading, setIsLoading] = useState(true);
    const [balance, setBalance] = useState(0);
    const [currency, setCurrency] = useState('EUR');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState(50);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (orgId) loadWallet();
    }, [orgId]);

    async function loadWallet() {
        setIsLoading(true);
        const res = await getWalletDataAction(orgId!);
        if (res.success && res.data) {
            setBalance(res.data.balance);
            setCurrency(res.data.currency);
            setTransactions(res.data.transactions);
        }
        setIsLoading(false);
    }

    async function handleTopUp() {
        if (topUpAmount <= 0) return;
        setIsProcessing(true);
        const res = await simulateTopUpAction(orgId!, topUpAmount);
        if (res.success) {
            toast({ title: "✅ Portefeuille rechargé", description: `+${topUpAmount}€ ajoutés`, className: "bg-green-600 text-white" });
            loadWallet();
            setIsTopUpOpen(false);
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
        setIsProcessing(false);
    }

    if (isLoading) {
        return (
            <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50">
                <CardContent className="p-6 flex items-center justify-center">
                    <Loader2 className="animate-spin text-violet-500 mr-2" /> Chargement...
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 overflow-hidden">
            <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200">
                            <Wallet className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-violet-900">Portefeuille Polyx</CardTitle>
                            <CardDescription className="text-violet-600">Crédits pour SMS, Emails, IA</CardDescription>
                        </div>
                    </div>
                    <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-violet-600 hover:bg-violet-700 gap-2 shadow-lg shadow-violet-200">
                                <Sparkles size={16} /> Recharger
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Recharger votre Portefeuille</DialogTitle>
                                <DialogDescription>Ajoutez des crédits pour utiliser les services intégrés</DialogDescription>
                            </DialogHeader>
                            <div className="py-6 space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    {[10, 50, 100].map(amt => (
                                        <Button
                                            key={amt}
                                            variant={topUpAmount === amt ? "primary" : "outline"}
                                            className={topUpAmount === amt ? "bg-violet-600" : ""}
                                            onClick={() => setTopUpAmount(amt)}
                                        >
                                            {amt}€
                                        </Button>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    <Label>Ou montant personnalisé</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={1000}
                                        value={topUpAmount}
                                        onChange={(e) => setTopUpAmount(parseFloat(e.target.value) || 0)}
                                        className="text-lg font-bold"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleTopUp} disabled={isProcessing || topUpAmount <= 0} className="bg-violet-600 hover:bg-violet-700 w-full">
                                    {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2" size={16} />}
                                    Payer {topUpAmount}€
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                {/* Balance Display */}
                <div className="text-center py-4 bg-white rounded-xl border border-violet-100 shadow-sm">
                    <p className="text-xs font-bold text-violet-500 uppercase mb-1">Solde Disponible</p>
                    <p className="text-5xl font-black text-violet-900">{balance.toFixed(2)}<span className="text-2xl ml-1">{currency}</span></p>
                </div>

                {/* Recent Transactions */}
                {transactions.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-violet-500 uppercase">Dernières Opérations</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {transactions.slice(0, 5).map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-violet-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                            {tx.amount > 0 ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">{tx.reference || tx.type}</p>
                                            <p className="text-xs text-slate-500">{format(new Date(tx.createdAt), 'dd/MM HH:mm', { locale: fr })}</p>
                                        </div>
                                    </div>
                                    <p className={`font-bold font-mono ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}€
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
