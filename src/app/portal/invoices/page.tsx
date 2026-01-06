'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Download, FileText, CheckCircle2, AlertCircle, CreditCard, Clock
} from 'lucide-react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function InvoicesPage() {
    // Mock data - In production this comes from getClientInvoicesAction
    const invoices = [
        { id: "1", number: "INV-2026-0034", date: "2026-01-02", amount: 4500, balance: 0, status: "PAID", dueDate: "2026-02-02" },
        { id: "2", number: "INV-2026-0012", date: "2025-12-15", amount: 2100, balance: 2100, status: "Partially Paid", dueDate: "2026-01-15" },
        { id: "3", number: "INV-2025-0899", date: "2025-11-20", amount: 8900, balance: 8900, status: "OVERDUE", dueDate: "2025-12-20" },
    ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none gap-1"><CheckCircle2 size={12} /> Payée</Badge>;
            case 'OVERDUE': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none gap-1"><AlertCircle size={12} /> En Retard</Badge>;
            default: return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none gap-1"><Clock size={12} /> À Payer</Badge>;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Facturation</h1>
                    <p className="text-slate-500">Consultez vos factures et effectuez vos règlements.</p>
                </div>
                <Card className="bg-indigo-600 text-white border-none shadow-lg">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Reste à payer</p>
                            <p className="text-xl font-bold">11 000,00 €</p>
                        </div>
                        <Button variant="secondary" size="sm" className="ml-4 font-bold text-indigo-700">Payer</Button>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-slate-50/50">
                                <TableHead>Numéro</TableHead>
                                <TableHead>Date d'émission</TableHead>
                                <TableHead>Échéance</TableHead>
                                <TableHead>Montant TTC</TableHead>
                                <TableHead>Reste Dû</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Télécharger</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.map((inv) => (
                                <TableRow key={inv.id} className="hover:bg-slate-50 transition-colors">
                                    <TableCell className="font-mono font-medium text-slate-700">
                                        {inv.number}
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(inv.date), 'dd MMMM yyyy', { locale: fr })}
                                    </TableCell>
                                    <TableCell className={inv.status === 'OVERDUE' ? 'text-red-600 font-bold' : ''}>
                                        {format(new Date(inv.dueDate), 'dd MMMM yyyy', { locale: fr })}
                                    </TableCell>
                                    <TableCell className="font-bold text-slate-900">
                                        {inv.amount.toLocaleString('fr-FR')} €
                                    </TableCell>
                                    <TableCell>
                                        {inv.balance > 0 ? (
                                            <span className="font-bold text-slate-900">{inv.balance.toLocaleString('fr-FR')} €</span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(inv.status)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200 text-slate-500">
                                            <Download size={16} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
