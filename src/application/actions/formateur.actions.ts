'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ============================================
// FORMATEUR CRUD
// ============================================

export async function getFormateursAction(orgId: string) {
    try {
        const formateurs = await prisma.formateur.findMany({
            where: { organisationId: orgId },
            include: {
                documents: true,
                _count: { select: { sessions: true, invoices: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, data: formateurs };
    } catch (error) {
        console.error('[FormateurAction] Error fetching formateurs:', error);
        return { success: false, error: 'Failed to fetch formateurs' };
    }
}

export async function getFormateurByIdAction(formateurId: string) {
    try {
        const formateur = await prisma.formateur.findUnique({
            where: { id: formateurId },
            include: {
                documents: true,
                sessions: { orderBy: { date: 'desc' }, take: 10 },
                invoices: { orderBy: { date: 'desc' }, take: 10 }
            }
        });
        return { success: true, data: formateur };
    } catch (error) {
        console.error('[FormateurAction] Error fetching formateur:', error);
        return { success: false, error: 'Failed to fetch formateur' };
    }
}

export async function createFormateurAction(data: {
    organisationId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    nda?: string;
    hourlyRate?: number;
    siret?: string;
    street?: string;
    zipCode?: string;
    city?: string;
}) {
    try {
        console.log(`[FormateurAction] 🆕 Creating formateur: ${data.firstName} ${data.lastName}`);

        const formateur = await prisma.formateur.create({
            data: {
                ...data,
                hourlyRate: data.hourlyRate || 30
            }
        });

        revalidatePath('/app/formateur');
        return { success: true, data: formateur };
    } catch (error) {
        console.error('[FormateurAction] Error creating formateur:', error);
        return { success: false, error: 'Failed to create formateur' };
    }
}

export async function updateFormateurAction(formateurId: string, data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    nda: string;
    hourlyRate: number;
    siret: string;
    iban: string;
    street: string;
    zipCode: string;
    city: string;
    isActive: boolean;
    isValidated: boolean;
}>) {
    try {
        const formateur = await prisma.formateur.update({
            where: { id: formateurId },
            data
        });
        revalidatePath('/app/formateur');
        return { success: true, data: formateur };
    } catch (error) {
        console.error('[FormateurAction] Error updating formateur:', error);
        return { success: false, error: 'Failed to update formateur' };
    }
}

// ============================================
// FORMATEUR DOCUMENTS
// ============================================

export async function addFormateurDocumentAction(formateurId: string, doc: {
    type: string;
    fileName: string;
    fileUrl: string;
    expiresAt?: Date;
}) {
    try {
        const document = await prisma.formateurDocument.create({
            data: {
                formateurId,
                ...doc
            }
        });
        revalidatePath('/app/formateur');
        return { success: true, data: document };
    } catch (error) {
        console.error('[FormateurAction] Error adding document:', error);
        return { success: false, error: 'Failed to add document' };
    }
}

export async function validateFormateurDocumentAction(documentId: string, isApproved: boolean, rejectionReason?: string) {
    try {
        const document = await prisma.formateurDocument.update({
            where: { id: documentId },
            data: {
                status: isApproved ? 'VALIDATED' : 'REJECTED',
                validatedAt: isApproved ? new Date() : null,
                rejectionReason: isApproved ? null : rejectionReason
            }
        });
        revalidatePath('/app/formateur');
        return { success: true, data: document };
    } catch (error) {
        console.error('[FormateurAction] Error validating document:', error);
        return { success: false, error: 'Failed to validate document' };
    }
}

// ============================================
// FORMATEUR INVOICES (Fournisseur)
// ============================================

export async function getFormateurInvoicesAction(orgId: string) {
    try {
        const invoices = await prisma.formateurInvoice.findMany({
            where: { organisationId: orgId },
            include: { formateur: true },
            orderBy: { date: 'desc' }
        });
        return { success: true, data: invoices };
    } catch (error) {
        console.error('[FormateurAction] Error fetching invoices:', error);
        return { success: false, error: 'Failed to fetch invoices' };
    }
}

export async function recordFormateurInvoiceAction(data: {
    organisationId: string;
    formateurId: string;
    number: string;
    dueDate: Date;
    hoursWorked: number;
    hourlyRate: number;
    fileUrl?: string;
    notes?: string;
}) {
    try {
        const totalAmount = data.hoursWorked * data.hourlyRate;

        const invoice = await prisma.formateurInvoice.create({
            data: {
                ...data,
                totalAmount
            }
        });

        revalidatePath('/app/formateur');
        return { success: true, data: invoice };
    } catch (error) {
        console.error('[FormateurAction] Error recording invoice:', error);
        return { success: false, error: 'Failed to record invoice' };
    }
}

export async function markFormateurInvoicePaidAction(invoiceId: string) {
    try {
        const invoice = await prisma.formateurInvoice.update({
            where: { id: invoiceId },
            data: {
                status: 'PAID',
                paidAt: new Date()
            }
        });
        revalidatePath('/app/formateur');
        return { success: true, data: invoice };
    } catch (error) {
        console.error('[FormateurAction] Error marking invoice paid:', error);
        return { success: false, error: 'Failed to mark invoice paid' };
    }
}

// ============================================
// FORMATEUR SESSIONS & EMARGEMENT
// ============================================

export async function getFormateurSessionsAction(formateurId: string) {
    try {
        const sessions = await prisma.trainingSession.findMany({
            where: { formateurId },
            include: {
                training: true,
                agency: true,
                attendanceLogs: true
            },
            orderBy: { date: 'desc' }
        });
        return { success: true, data: sessions };
    } catch (error) {
        console.error('[FormateurAction] Error fetching sessions:', error);
        return { success: false, error: 'Failed to fetch sessions' };
    }
}

// ============================================
// LETTRE D'ÉMISSION (PDF DATA)
// ============================================

export async function generateEmissionLetterDataAction(formateurId: string) {
    try {
        const formateur = await prisma.formateur.findUnique({
            where: { id: formateurId },
            include: {
                organisation: true,
                sessions: {
                    orderBy: { date: 'desc' },
                    take: 20,
                    include: { training: true }
                }
            }
        });

        if (!formateur) return { success: false, error: 'Formateur not found' };

        // Calculate total hours from sessions
        const totalHours = formateur.sessions.reduce((sum, s) => {
            const start = s.startTime ? parseInt(s.startTime.split(':')[0]) : 0;
            const end = s.endTime ? parseInt(s.endTime.split(':')[0]) : 0;
            return sum + (end - start);
        }, 0);

        return {
            success: true,
            data: {
                formateur: {
                    name: `${formateur.firstName} ${formateur.lastName}`,
                    nda: formateur.nda,
                    siret: formateur.siret,
                    address: `${formateur.street || ''}, ${formateur.zipCode || ''} ${formateur.city || ''}`.trim(),
                    hourlyRate: formateur.hourlyRate
                },
                organisation: {
                    name: formateur.organisation.name,
                    nda: formateur.organisation.nda,
                    address: `${formateur.organisation.street || ''}, ${formateur.organisation.zipCode || ''} ${formateur.organisation.city || ''}`.trim()
                },
                sessions: formateur.sessions.map(s => ({
                    date: s.date,
                    title: s.title || s.training?.title || 'Session',
                    duration: s.startTime && s.endTime ? `${s.startTime} - ${s.endTime}` : 'N/A'
                })),
                totalHours,
                totalAmount: totalHours * formateur.hourlyRate,
                generatedAt: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error('[FormateurAction] Error generating emission letter:', error);
        return { success: false, error: 'Failed to generate emission letter data' };
    }
}
