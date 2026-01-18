import { prisma } from '@/lib/prisma';
import { LeadStatus, SalesStage } from '@/domain/entities/lead';

export class LearnerService {
    /**
     * Bridges a Lead to a Learner dossier.
     * Creates the Learner record and an initial LearnerFolder if they don't exist.
     */
    static async bridgeLeadToLearner(leadId: string, organisationId: string, agencyId?: string) {
        console.log(`[LearnerService] 🚀 Bridging Lead ${leadId} to CRM`);

        // 1. Fetch Lead Info
        const lead = await prisma.lead.findUnique({
            where: { id: leadId }
        });

        if (!lead) {
            throw new Error(`Lead ${leadId} not found for bridging`);
        }

        // 2. Check if learner already exists
        const existingLearner = await prisma.learner.findUnique({
            where: { leadId: leadId }
        });

        if (existingLearner) {
            console.log(`[LearnerService] ℹ️ Learner already exists for Lead ${leadId}`);
            return existingLearner;
        }

        // 3. Create Learner & Folder
        const learner = await prisma.learner.create({
            data: {
                organisationId: organisationId,
                leadId: leadId,
                // Copy Identity
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email || '',
                phone: lead.phone,
                // Address
                address: lead.street,
                postalCode: lead.zipCode,
                city: lead.city,
                // Agency
                agencyId: agencyId || lead.agencyId,
                // Initial Folder
                folders: {
                    create: {
                        status: 'ONBOARDING',
                        fundingType: 'PERSO', // Default, will be qualified in CRM
                        complianceStatus: 'PENDING'
                    }
                }
            },
            include: {
                folders: true
            }
        });

        console.log(`[LearnerService] ✅ Successfully created Learner ${learner.id} and Folder`);
        return learner;
    }
}
