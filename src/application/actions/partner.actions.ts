'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getPartnersAction(orgId: string, type?: string) {
    try {
        const partners = await (prisma as any).ecosystemPartner.findMany({
            where: {
                organisationId: orgId,
                ...(type ? { type } : {})
            },
            orderBy: { name: 'asc' }
        });
        return { success: true, data: partners };
    } catch (error) {
        console.error('[PartnerAction] Error fetching partners:', error);
        return { success: false, error: 'Failed to fetch partners' };
    }
}

export async function createPartnerAction(data: {
    organisationId: string;
    name: string;
    type: string;
    siret?: string;
    street?: string;
    zipCode?: string;
    city?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
}) {
    try {
        const partner = await (prisma as any).ecosystemPartner.create({
            data
        });
        revalidatePath('/app/billing/partners');
        return { success: true, data: partner };
    } catch (error) {
        console.error('[PartnerAction] Error creating partner:', error);
        return { success: false, error: 'Failed to create partner' };
    }
}

export async function updatePartnerAction(id: string, data: any) {
    try {
        const partner = await (prisma as any).ecosystemPartner.update({
            where: { id },
            data
        });
        revalidatePath('/app/billing/partners');
        return { success: true, data: partner };
    } catch (error) {
        console.error('[PartnerAction] Error updating partner:', error);
        return { success: false, error: 'Failed to update partner' };
    }
}

export async function deletePartnerAction(id: string) {
    try {
        await (prisma as any).ecosystemPartner.delete({ where: { id } });
        revalidatePath('/app/billing/partners');
        return { success: true };
    } catch (error) {
        console.error('[PartnerAction] Error deleting partner:', error);
        return { success: false, error: 'Failed to delete partner' };
    }
}
