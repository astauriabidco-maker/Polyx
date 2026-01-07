'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ============================================
// INVOICE ACTIONS
// ============================================

export async function getInvoicesAction(orgId: string) {
    try {
        const invoices = await prisma.invoice.findMany({
            where: { organisationId: orgId },
            orderBy: { date: 'desc' },
            include: {
                payments: { select: { amount: true } }
            }
        });

        // Quick fix: Prisma schema has 'payments' plural.
        // Let's re-read schema if needed, but standard is plural.
        // We will fetch lines on detail, list usually needs header info.

        return { success: true, data: invoices };
    } catch (error) {
        console.error('[InvoiceAction] Error fetching invoices:', error);
        return { success: false, error: 'Failed to fetch invoices' };
    }
}

export async function getInvoiceByIdAction(invoiceId: string) {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                lines: true,
                organisation: true,
                clientCompany: true,
                folder: { include: { learner: true } }
            }
        });

        if (!invoice) return { success: false, error: 'Invoice not found' };

        return { success: true, data: invoice };
    } catch (error) {
        console.error('[InvoiceAction] Error fetching invoice:', error);
        return { success: false, error: 'Failed to fetch invoice' };
    }
}

export async function createInvoiceAction(data: {
    organisationId: string;
    payerType: 'LEARNER' | 'COMPANY' | 'OPCO';
    payerName: string;
    payerAddress?: string;
    payerSiret?: string;
    clientCompanyId?: string;
    folderId?: string;
    dueDate: Date;
    lines: { description: string; quantity: number; unitPrice: number; taxRate?: number }[];
    publicNote?: string;
    chorusEngagement?: string;
    chorusServiceCode?: string;
}) {
    try {
        // 1. Generate Invoice Number (Simple Auto-Increment Simulation or Format)
        // Format: INV-YYYY-SEQ (e.g., INV-2026-0001)
        const year = new Date().getFullYear();
        const count = await prisma.invoice.count({
            where: { organisationId: data.organisationId }
        });
        const sequence = (count + 1).toString().padStart(4, '0');
        const number = `INV-${year}-${sequence}`;

        // 2. Calculate Totals
        let subTotal = 0;
        let taxAmount = 0;

        const linesData = data.lines.map(line => {
            const lineTotal = line.quantity * line.unitPrice;
            subTotal += lineTotal;
            const lineTax = lineTotal * (line.taxRate || 0) / 100;
            taxAmount += lineTax;

            return {
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                taxRate: line.taxRate || 0,
                total: lineTotal + lineTax
            };
        });

        const totalAmount = subTotal + taxAmount;

        // 3. Create Invoice
        const invoice = await (prisma as any).invoice.create({
            data: {
                organisationId: data.organisationId,
                number,
                payerType: data.payerType,
                payerName: data.payerName,
                payerAddress: data.payerAddress,
                payerSiret: data.payerSiret,
                clientCompanyId: data.clientCompanyId,
                folderId: data.folderId,
                date: new Date(),
                dueDate: data.dueDate,
                status: 'DRAFT',
                subTotal,
                taxAmount,
                totalAmount,
                balanceDue: totalAmount,
                publicNote: data.publicNote,
                chorusEngagement: data.chorusEngagement,
                chorusServiceCode: data.chorusServiceCode,
                lines: {
                    create: linesData
                }
            }
        });

        revalidatePath('/app/billing/invoices');
        return { success: true, data: invoice };

    } catch (error) {
        console.error('[InvoiceAction] Error creating invoice:', error);
        return { success: false, error: 'Failed to create invoice' };
    }
}

export async function updateInvoiceStatusAction(invoiceId: string, status: string) {
    try {
        const invoice = await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status,
                ...(status === 'SENT' ? { sentAt: new Date() } : {})
            }
        });
        revalidatePath('/app/billing/invoices');
        revalidatePath(`/app/billing/invoices/${invoiceId}`);
        return { success: true, data: invoice };
    } catch (error) {
        console.error('[InvoiceAction] Error updating invoice status:', error);
        return { success: false, error: 'Failed to update invoice status' };
    }
}

export async function deleteInvoiceAction(invoiceId: string) {
    try {
        // Allow delete only if DRAFT
        const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
        if (!invoice || invoice.status !== 'DRAFT') {
            return { success: false, error: 'Cannot delete invoice (must be DRAFT)' };
        }

        await prisma.invoice.delete({ where: { id: invoiceId } });
        revalidatePath('/app/billing/invoices');
        return { success: true };
    } catch (error) {
        console.error('[InvoiceAction] Error deleting invoice:', error);
        return { success: false, error: 'Failed to delete invoice' };
    }
}
