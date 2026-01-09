'use server';

import { prisma } from '@/lib/prisma';
import { FilterGroup } from '@/domain/entities/filter';
import { FilterService } from '@/application/services/filter.service';
import { revalidatePath } from 'next/cache';
import { NurturingService } from '@/application/services/nurturing.service';

/**
 * Fetches all segments for an organisation.
 */
export async function getSegmentsAction(organisationId: string) {
    try {
        const segments = await prisma.leadSegment.findMany({
            where: { organisationId },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, segments };
    } catch (error: any) {
        console.error("Get Segments Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Creates a new segment.
 */
export async function createSegmentAction(data: {
    organisationId: string,
    name: string,
    description?: string,
    filterGroup: FilterGroup
}) {
    try {
        const segment = await prisma.leadSegment.create({
            data: {
                organisationId: data.organisationId,
                name: data.name,
                description: data.description,
                filterGroup: data.filterGroup as any
            }
        });
        revalidatePath('/app/leads/segments');
        return { success: true, segment };
    } catch (error: any) {
        console.error("Create Segment Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Deletes a segment.
 */
export async function deleteSegmentAction(segmentId: string) {
    try {
        await prisma.leadSegment.delete({
            where: { id: segmentId }
        });
        revalidatePath('/app/leads/segments');
        return { success: true };
    } catch (error: any) {
        console.error("Delete Segment Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Executes a segment and returns the matching leads.
 */
export async function executeSegmentAction(segmentId: string) {
    try {
        const segment = await prisma.leadSegment.findUnique({
            where: { id: segmentId }
        });

        if (!segment) throw new Error("Segment not found");

        const filterGroup = segment.filterGroup as unknown as FilterGroup;

        // Fetch all active leads for the organisation
        const leads = await prisma.lead.findMany({
            where: { organisationId: segment.organisationId }
        });

        // Filter leads using FilterService
        const matchingLeads = FilterService.filterArray(leads, filterGroup);

        return { success: true, leads: matchingLeads };
    } catch (error: any) {
        console.error("Execute Segment Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Enrolls all leads in a segment into a nurturing sequence.
 */
export async function enrollSegmentInSequenceAction(segmentId: string, sequenceId: string) {
    try {
        const res = await executeSegmentAction(segmentId);
        if (!res.success || !res.leads) throw new Error(res.error || "Failed to execute segment");

        const segment = await prisma.leadSegment.findUnique({ where: { id: segmentId } });
        if (!segment) throw new Error("Segment not found");

        const enrollmentPromises = res.leads.map(lead =>
            NurturingService.enrollLead(lead.id, sequenceId, segment.organisationId)
        );

        await Promise.all(enrollmentPromises);

        return { success: true, count: res.leads.length };
    } catch (error: any) {
        console.error("Enroll Segment in Sequence Error:", error);
        return { success: false, error: error.message };
    }
}
