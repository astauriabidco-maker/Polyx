'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ============================================
// INVOICE MANAGEMENT
// ============================================

export async function createInvoiceAction(data: {
    organisationId: string;
    folderId?: string;
    payerType: string;
    payerName: string;
    payerAddress?: string;
    payerSiret?: string;
    date?: Date;
    dueDate?: Date;
    type?: string;
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
    }[];
    publicNote?: string;
}) {
    try {
        // Generate Invoice Number (Simple sequential logic for now)
        const count = await (prisma as any).invoice.count({ where: { organisationId: data.organisationId } });
        const year = new Date().getFullYear();
        const number = `INV-${year}-${(count + 1).toString().padStart(4, '0')}`;

        // Calculate Totals
        let subTotal = 0;
        let taxAmount = 0;

        const linesData = data.items.map(item => {
            const total = item.quantity * item.unitPrice;
            const tax = total * (item.taxRate || 0) / 100;
            subTotal += total;
            taxAmount += tax;

            return {
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxRate: item.taxRate || 0,
                total
            };
        });

        const totalAmount = subTotal + taxAmount;
        const dueDate = data.dueDate || new Date(new Date().setDate(new Date().getDate() + 30)); // Default 30 days

        const invoice = await (prisma as any).invoice.create({
            data: {
                organisationId: data.organisationId,
                folderId: data.folderId,
                payerType: data.payerType,
                payerName: data.payerName,
                payerAddress: data.payerAddress,
                payerSiret: data.payerSiret,

                number,
                date: data.date || new Date(),
                dueDate,
                status: 'DRAFT',
                type: data.type || 'INVOICE',

                subTotal,
                taxAmount,
                totalAmount,
                balanceDue: totalAmount,

                publicNote: data.publicNote,

                lines: {
                    create: linesData
                }
            },
            include: { lines: true }
        });

        revalidatePath('/app/network');
        return { success: true, invoice };

    } catch (error) {
        console.error("Create Invoice Error:", error);
        return { success: false, error: "Erreur lors de la création de la facture" };
    }
}

export async function getInvoicesAction(organisationId: string, status?: string) {
    try {
        const invoices = await (prisma as any).invoice.findMany({
            where: {
                organisationId,
                ...(status ? { status } : {})
            },
            include: {
                folder: { include: { learner: true } },
                lines: true,
                payments: true
            },
            orderBy: { date: 'desc' }
        });

        return { success: true, invoices };
    } catch (error) {
        console.error("Get Invoices Error:", error);
        return { success: false, error: "Erreur lors de la récupération des factures" };
    }
}

export async function recordPaymentAction(data: {
    invoiceId: string;
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
}) {
    try {
        const invoice = await (prisma as any).invoice.findUnique({
            where: { id: data.invoiceId }
        });

        if (!invoice) return { success: false, error: "Facture introuvable" };

        const payment = await (prisma as any).payment.create({
            data: {
                invoiceId: data.invoiceId,
                amount: data.amount,
                method: data.method,
                reference: data.reference,
                notes: data.notes,
                status: 'COMPLETED'
            }
        });

        // Update Invoice Balance & Status
        const newBalance = invoice.balanceDue - data.amount;
        const newStatus = newBalance <= 0.01 ? 'PAID' : 'PARTIAL';

        await (prisma as any).invoice.update({
            where: { id: data.invoiceId },
            data: {
                balanceDue: newBalance,
                status: newStatus
            }
        });

        revalidatePath('/app/network');
        return { success: true, payment };

    } catch (error) {
        console.error("Record Payment Error:", error);
        return { success: false, error: "Erreur lors de l'enregistrement du paiement" };
    }
}

export async function getFinanceStatsAction(organisationId: string) {
    try {
        const invoices = await (prisma as any).invoice.findMany({
            where: { organisationId }
        });

        const totalBilled = invoices.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0);
        const totalPaid = invoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount - inv.balanceDue), 0);
        const totalDue = totalBilled - totalPaid;
        const overdueCount = invoices.filter((inv: any) => inv.status === 'OVERDUE' || (inv.dueDate < new Date() && inv.balanceDue > 0)).length;

        return {
            success: true,
            stats: {
                totalBilled,
                totalPaid,
                totalDue,
                overdueCount,
                collectionRate: totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0
            }
        };
    } catch (error) {
        console.error("Finance Stats Error:", error);
        return { success: false, error: "Erreur lors du calcul des statistiques" };
    }
}
