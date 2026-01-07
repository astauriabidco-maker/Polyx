'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/application/store/auth-store';
import { getInvoiceByIdAction, updateInvoiceStatusAction } from '@/application/actions/invoice.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ChevronLeft, Printer, Send, CreditCard, Download, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function InvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const { activeOrganization } = useAuthStore();
    const [invoice, setInvoice] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadInvoice();
    }, [id]);

    async function loadInvoice() {
        setIsLoading(true);
        const res = await getInvoiceByIdAction(id);
        if (res.success && res.data) {
            setInvoice(res.data);
        }
        setIsLoading(false);
    }

    async function handleStatusChange(status: string) {
        if (!confirm(`Passer la facture en statut ${status} ?`)) return;
        const res = await updateInvoiceStatusAction(id, status);
        if (res.success) loadInvoice();
    }

    if (isLoading) return <div className="p-20 text-center text-slate-400">Chargement...</div>;
    if (!invoice) return <div className="p-20 text-center text-slate-400">Facture introuvable.</div>;

    const org = invoice.organisation;

    return (
        <div className="min-h-screen bg-slate-50 pb-20 p-8">

            {/* Action Bar (No Print) */}
            <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ChevronLeft className="text-slate-400" /> Retour
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer size={16} className="mr-2" /> Imprimer / PDF
                    </Button>

                    {invoice.status === 'DRAFT' && (
                        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => handleStatusChange('SENT')}>
                            <Send size={16} className="mr-2" /> Marquer comme Envoyée
                        </Button>
                    )}

                    {invoice.status === 'SENT' && (
                        <>
                            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusChange('PAID')}>
                                <CheckCircle size={16} className="mr-2" /> Marquer comme Payée
                            </Button>

                            {/* STRIPE PAYMENT BUTTON */}
                            {invoice.balanceDue > 0 && (
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    onClick={async () => {
                                        if (!confirm("Générer un lien de paiement Stripe sécurisé ?")) return;
                                        const { generateInvoicePaymentLinkAction } = await import('@/application/actions/stripe.actions');
                                        const res = await generateInvoicePaymentLinkAction(invoice.id);
                                        if (res.success && res.url) {
                                            window.open(res.url, '_blank');
                                            loadInvoice(); // Refresh to see link
                                        } else {
                                            alert(res.error || "Erreur génération lien");
                                        }
                                    }}
                                >
                                    <CreditCard size={16} className="mr-2" /> Payer en ligne
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* A4 Invoice Preview */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none min-h-[297mm] relative text-slate-900 font-sans">

                {/* Header */}
                <div className="p-12 pb-8 flex justify-between items-start border-b border-slate-100">
                    <div>
                        {org.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={org.logo} alt={org.name} className="h-16 object-contain mb-4" />
                        ) : (
                            <h1 className="text-2xl font-bold mb-4 text-indigo-900">{org.name}</h1>
                        )}
                        <div className="text-sm text-slate-500 space-y-1">
                            <p>{org.street}</p>
                            <p>{org.zipCode} {org.city}</p>
                            <p>{org.country}</p>
                            {org.siret && <p className="mt-2 text-xs">SIRET: {org.siret}</p>}
                            {org.nda && <p className="text-xs">NDA: {org.nda}</p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-light text-slate-300 mb-2">FACTURE</h2>
                        <p className="font-bold text-lg text-slate-700">{invoice.number}</p>
                        <p className="text-sm text-slate-500 mb-4">Emise le : {format(new Date(invoice.date), 'dd MMMM yyyy', { locale: fr })}</p>

                        {invoice.status !== 'PAID' && (
                            <div className="bg-amber-50 text-amber-900 px-3 py-1 rounded inline-block text-sm font-bold border border-amber-100">
                                À payer avant le : {format(new Date(invoice.dueDate), 'dd/MM/yyyy')}
                            </div>
                        )}
                        {invoice.status === 'PAID' && (
                            <div className="bg-emerald-50 text-emerald-900 px-4 py-1 rounded inline-block text-sm font-bold border border-emerald-100">
                                PAYÉE le {invoice.updatedAt ? format(new Date(invoice.updatedAt), 'dd/MM/yyyy') : '-'}
                            </div>
                        )}
                    </div>
                </div>



                {/* PAYMENT LINK BANNER */}
                {invoice.stripePaymentUrl && invoice.status !== 'PAID' && (
                    <div className="mx-12 mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center print:hidden">
                        <div className="flex items-center gap-3 text-indigo-800">
                            <div className="p-2 bg-indigo-100 rounded-full"><CreditCard size={18} /></div>
                            <div>
                                <p className="font-bold text-sm">Lien de paiement actif</p>
                                <p className="text-xs opacity-80">Le client peut régler cette facture par CB.</p>
                            </div>
                        </div>
                        <a
                            href={invoice.stripePaymentUrl}
                            target="_blank"
                            className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                        >
                            Voir le lien <ChevronLeft className="rotate-180" size={12} />
                        </a>
                    </div>
                )}

                {/* Client Info */}
                <div className="p-12 py-8 grid grid-cols-2 gap-12">
                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Facturé à</p>
                        <p className="font-bold text-lg text-slate-900">{invoice.payerName}</p>
                        <p className="text-sm text-slate-600 whitespace-pre-line mt-1">{invoice.payerAddress}</p>
                        {invoice.payerSiret && <p className="text-xs text-slate-400 mt-2">SIRET: {invoice.payerSiret}</p>}
                    </div>
                </div>

                {/* Lines */}
                <div className="p-12 py-4">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-slate-900 text-sm">
                                <th className="pb-3 w-1/2">Description</th>
                                <th className="pb-3 text-right">Qté</th>
                                <th className="pb-3 text-right">Prix Unit.</th>
                                <th className="pb-3 text-right">Total HT</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoice.lines.map((line: any) => (
                                <tr key={line.id}>
                                    <td className="py-4 text-sm font-medium text-slate-700">{line.description}</td>
                                    <td className="py-4 text-sm text-right text-slate-500">{line.quantity}</td>
                                    <td className="py-4 text-sm text-right text-slate-500">{line.unitPrice.toFixed(2)} €</td>
                                    <td className="py-4 text-sm text-right font-bold text-slate-700">{(line.quantity * line.unitPrice).toFixed(2)} €</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Total */}
                <div className="px-12 flex justify-end">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>Total HT</span>
                            <span>{invoice.subTotal.toFixed(2)} €</span>
                        </div>
                        {invoice.taxAmount > 0 && (
                            <div className="flex justify-between text-sm text-slate-500">
                                <span>TVA ({invoice.lines[0]?.taxRate}%)</span>
                                <span>{invoice.taxAmount.toFixed(2)} €</span>
                            </div>
                        )}
                        {!invoice.taxAmount && (
                            <div className="flex justify-between text-xs text-slate-400 italic">
                                <span>TVA non applicable (Art. 293B CGI ou Exonération formation)</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xl font-bold text-slate-900 border-t-2 border-slate-900 pt-2 mt-2">
                            <span>Total TTC</span>
                            <span>{invoice.totalAmount.toFixed(2)} €</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-12 text-center text-xs text-slate-400 border-t border-slate-100">
                    <p>{org.name} - {org.street} {org.zipCode} {org.city}</p>
                    <p>SIRET: {org.siret} - NDA: {org.nda}</p>
                    <p className="mt-2">Membre d'une association agréée, le règlement par chèque et carte bancaire est accepté.</p>
                </div>
            </div>
        </div >
    );
}
