
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export type ExportFormat = 'GENERIC_CSV' | 'SAGE_FEC' | 'PENNYLANE';

export class AccountingExportService {

    async generateExport(orgId: string, exportFormat: ExportFormat, startDate: Date, endDate: Date): Promise<string> {
        // Fetch invoices
        const invoices = await (prisma as any).invoice.findMany({
            where: {
                organisationId: orgId,
                date: {
                    gte: startDate,
                    lte: endDate
                },
                status: {
                    in: ['SENT', 'PAID', 'OVERDUE'] // Only finalized invoices
                }
            },
            include: {
                lines: true
            },
            orderBy: {
                date: 'asc'
            }
        });

        switch (exportFormat) {
            case 'SAGE_FEC':
                return this.toSageFormat(invoices);
            case 'PENNYLANE':
                return this.toPennylaneFormat(invoices);
            case 'GENERIC_CSV':
            default:
                return this.toGenericCsv(invoices);
        }
    }

    private toGenericCsv(invoices: any[]): string {
        const header = ['Numero', 'Date', 'Client', 'Total HT', 'TVA', 'Total TTC', 'Statut'].join(';') + '\n';
        const rows = invoices.map(inv => {
            return [
                inv.number,
                format(inv.date, 'dd/MM/yyyy'),
                `"${inv.payerName.replace(/"/g, '""')}"`, // Escape quotes
                inv.subTotal.toFixed(2),
                inv.taxAmount.toFixed(2),
                inv.totalAmount.toFixed(2),
                inv.status
            ].join(';');
        });
        return header + rows.join('\n');
    }

    private toSageFormat(invoices: any[]): string {
        // Simplified Sage Import Format (PNM)
        // Journal;Date;Piece;Reference;Compte;Libelle;Debit;Credit
        // Vente header
        const header = ['Journal', 'Date', 'Piece', 'Reference', 'CompteGenerale', 'CompteAuxiliaire', 'Libelle', 'MontantDebit', 'MontantCredit'].join(';') + '\n';

        let rows: string[] = [];

        invoices.forEach(inv => {
            const dateStr = format(inv.date, 'ddMMyy');
            const ref = inv.number;
            const libelle = `Facture ${inv.payerName}`;

            // 1. Client Line (Debit - TTC)
            // Account: 411 + usually Aux or just 411000
            // For simplicity, we assume 411000 or derive from client ID if available
            rows.push([
                'VT', // Journal Ventes
                dateStr,
                ref,
                ref,
                '411000', // General Account
                inv.payerName.substring(0, 10).toUpperCase(), // Aux (simplified)
                libelle,
                inv.totalAmount.toFixed(2),
                '0.00'
            ].join(';'));

            // 2. Revenue Line (Credit - HT)
            // Account: 706000 (Prestation de services)
            rows.push([
                'VT',
                dateStr,
                ref,
                ref,
                '706000',
                '',
                libelle,
                '0.00',
                inv.subTotal.toFixed(2)
            ].join(';'));

            // 3. VAT Line (Credit - TVA) if > 0
            if (inv.taxAmount > 0) {
                rows.push([
                    'VT',
                    dateStr,
                    ref,
                    ref,
                    '445710', // TVA Collectée
                    '',
                    libelle,
                    '0.00',
                    inv.taxAmount.toFixed(2)
                ].join(';'));
            }
        });

        return header + rows.join('\n');
    }

    private toPennylaneFormat(invoices: any[]): string {
        // Pennylane Import CSV
        // date, invoice_number, label, customer_name, amount_ht, amount_vat, amount_ttc, currency
        const header = ['date', 'invoice_number', 'label', 'customer_name', 'amount_ht', 'amount_vat', 'amount_ttc', 'currency'].join(',') + '\n';

        const rows = invoices.map(inv => {
            return [
                format(inv.date, 'yyyy-MM-dd'),
                inv.number,
                `Facture ${inv.number}`,
                `"${inv.payerName.replace(/"/g, '""')}"`,
                inv.subTotal.toFixed(2),
                inv.taxAmount.toFixed(2),
                inv.totalAmount.toFixed(2),
                'EUR'
            ].join(',');
        });

        return header + rows.join('\n');
    }
}
