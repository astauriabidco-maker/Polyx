'use server';

import { db, LegalDocument } from '@/infrastructure/mock-db';
import { revalidatePath } from 'next/cache';

export async function getLegalDocumentsAction(type: 'DPA' | 'CGU'): Promise<{ success: boolean; documents?: LegalDocument[] }> {
    try {
        const docs = db.legalDocuments
            .filter(d => d.type === type)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return { success: true, documents: docs };
    } catch (error) {
        return { success: false };
    }
}

export async function getActiveLegalDocumentAction(type: 'DPA' | 'CGU'): Promise<{ success: boolean; document?: LegalDocument }> {
    try {
        const doc = db.legalDocuments.find(d => d.type === type && d.isActive);
        return { success: true, document: doc };
    } catch (error) {
        return { success: false };
    }
}

export async function createLegalDocumentVersionAction(
    type: 'DPA' | 'CGU',
    title: string,
    sections: { title: string; content: string }[]
): Promise<{ success: boolean; id?: string }> {
    try {
        // Calculate next version
        const existingDocs = db.legalDocuments.filter(d => d.type === type);
        const lastVersion = existingDocs.length > 0 ? existingDocs.length : 0;
        const newVersion = `v${lastVersion + 1}`;

        const newDoc: LegalDocument = {
            id: `${type.toLowerCase()}-${newVersion}-${Date.now()}`,
            type,
            version: newVersion,
            title,
            sections,
            isActive: false, // Created as Draft
            createdAt: new Date()
        };

        db.legalDocuments.push(newDoc);
        revalidatePath('/app/settings/legal');
        return { success: true, id: newDoc.id };
    } catch (error) {
        return { success: false };
    }
}

export async function publishLegalDocumentVersionAction(id: string): Promise<{ success: boolean }> {
    try {
        const docToPublish = db.legalDocuments.find(d => d.id === id);
        if (!docToPublish) return { success: false };

        // Deactivate all others of same type
        db.legalDocuments.forEach(d => {
            if (d.type === docToPublish.type) {
                d.isActive = false;
            }
        });

        // Activate this one
        docToPublish.isActive = true;
        docToPublish.publishedAt = new Date();

        revalidatePath('/app/settings/legal');
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function updateLegalDocumentAction(
    id: string,
    sections: { title: string; content: string }[]
): Promise<{ success: boolean }> {
    try {
        const doc = db.legalDocuments.find(d => d.id === id);
        if (!doc) return { success: false };

        // Prevent editing if already published/active (simple rule for now)
        if (doc.isActive) {
            // allow editing content of active but maybe warn? For now let's allow it as it's a "live" edit
        }

        doc.sections = sections;
        revalidatePath('/app/settings/legal');
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}
