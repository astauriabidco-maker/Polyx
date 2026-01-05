'use server';

import { prisma } from "@/lib/prisma";
import { User, LearnerFolder } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { ComplianceEngine } from "../services/compliance-engine";
import { FundingType, DocumentType } from "@/domain/entities/learner";

// --- QUERY ACTIONS ---

export async function getLearnersAction(organisationId: string) {
    try {
        const learners = await prisma.learner.findMany({
            where: { organisationId },
            include: {
                folders: {
                    include: { documents: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, learners };
    } catch (error) {
        console.error("Error fetching learners:", error);
        return { success: false, error: "Failed to fetch learners" };
    }
}

export async function getLearnerDetailsAction(learnerId: string) {
    try {
        const learner = await (prisma as any).learner.findUnique({
            where: { id: learnerId },
            include: {
                agency: true,
                folders: {
                    include: { documents: true, training: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        return { success: true, learner };
    } catch (error) {
        return { success: false, error: "Failed to fetch learner details" };
    }
}

// --- MUTATION ACTIONS ---

/**
 * Creates a Learner from a signed Lead (Closing phase)
 */
export async function createLearnerFromLeadAction(leadId: string, fundingType: FundingType, trainingId?: string) {
    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) return { success: false, error: "Lead not found" };

        // 1. Create Learner Identity
        const learner = await prisma.learner.create({
            data: {
                organisationId: lead.organisationId,
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email || "no-email",
                phone: lead.phone,
                leadId: lead.id
            }
        });

        // 2. Determine Required Documents
        const requirements = ComplianceEngine.getRequirements(fundingType);

        // 3. Create Folder with Documents
        const folder = await prisma.learnerFolder.create({
            data: {
                learnerId: learner.id,
                fundingType,
                status: 'ONBOARDING',
                complianceStatus: 'PENDING',
                trainingId,
                documents: {
                    create: requirements.map(req => ({
                        type: req.type,
                        label: req.label,
                        isRequired: req.required,
                        status: 'MISSING'
                    }))
                }
            }
        });

        // 4. Update Lead to WON/CLOSED if not already
        await prisma.lead.update({
            where: { id: leadId },
            data: { salesStage: 'GAGNE', status: 'CLIENT' }
        });

        revalidatePath('/app/crm');
        revalidatePath('/app/learners');

        return { success: true, learnerId: learner.id };

    } catch (error) {
        console.error("Create Learner Error:", error);
        return { success: false, error: "Failed to create learner" };
    }
}

/**
 * Manually create a learner (bypass CRM)
 */
export async function createLearnerAction(data: {
    organisationId: string,
    firstName: string,
    lastName: string,
    email: string,
    fundingType: FundingType
}) {
    try {
        const learner = await prisma.learner.create({
            data: {
                organisationId: data.organisationId,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
            }
        });

        const requirements = ComplianceEngine.getRequirements(data.fundingType);

        await prisma.learnerFolder.create({
            data: {
                learnerId: learner.id,
                fundingType: data.fundingType,
                documents: {
                    create: requirements.map(req => ({
                        type: req.type,
                        label: req.label,
                        isRequired: req.required,
                        status: 'MISSING'
                    }))
                }
            }
        });

        revalidatePath('/app/learners');
        return { success: true, learner };
    } catch (error) {
        return { success: false, error: "Failed to create learner" };
    }
}

export async function updateLearnerFolderAction(folderId: string, data: Partial<LearnerFolder>) {
    try {
        const input = data as any;
        const allowedUpdates: any = {};
        if (input.isBlocked !== undefined) allowedUpdates.isBlocked = input.isBlocked;
        if (input.isLowLevel !== undefined) allowedUpdates.isLowLevel = input.isLowLevel;
        if (input.isDropoutRisk !== undefined) allowedUpdates.isDropoutRisk = input.isDropoutRisk;
        if (input.examDate !== undefined) allowedUpdates.examDate = input.examDate;
        if (input.blockReason !== undefined) allowedUpdates.blockReason = input.blockReason;

        // Lifecycle Fields
        if (input.status !== undefined) allowedUpdates.status = input.status;
        if (input.actualStartDate !== undefined) allowedUpdates.actualStartDate = input.actualStartDate;
        if (input.invoicedDate !== undefined) allowedUpdates.invoicedDate = input.invoicedDate;

        if (input.invoicedDate !== undefined) allowedUpdates.invoicedDate = input.invoicedDate;

        console.log("Upating Folder:", folderId, "with data:", allowedUpdates);

        const updated = await prisma.learnerFolder.update({
            where: { id: folderId },
            data: allowedUpdates
        });

        console.log("Update Success:", updated);

        // Revalidate the learner details page
        revalidatePath(`/app/learners/${updated.learnerId}`);

        return { success: true, folder: updated };
    } catch (error) {
        console.error("Update Folder Error:", error);
        return { success: false, error: "Failed to update folder" };
    }
}

export async function updateLearnerAgencyAction(learnerId: string, agencyId: string | null) {
    try {
        const updated = await (prisma as any).learner.update({
            where: { id: learnerId },
            data: { agencyId: agencyId || null }
        });

        revalidatePath(`/app/learners/${learnerId}`);
        return { success: true, learner: updated };
    } catch (error) {
        console.error("Update Learner Agency Error:", error);
        return { success: false, error: "Failed to update learner agency" };
    }
}
