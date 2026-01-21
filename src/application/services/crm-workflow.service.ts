import { Lead, SalesStage, LeadStatus, LeadHistoryEntry } from '@/domain/entities/lead';
import { prisma } from '@/lib/prisma';

/**
 * CrmWorkflowService - State Machine for Lead Lifecycle in CRM
 * NOW WITH PRISMA PERSISTENCE & CORRECT SCHEMA MAPPING
 */
export class CrmWorkflowService {

    // --- Core Transition Helpers ---

    private static async getLead(leadId: string): Promise<Lead> {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) throw new Error(`Lead ${leadId} not found`);
        const leadAny = lead as any; // Bypass strict typing due to Prisma client sync delay in IDE

        // Map DB Model to Domain Entity
        return {
            id: lead.id,
            organizationId: lead.organisationId,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            status: lead.status as any,
            salesStage: lead.salesStage as any,

            metadata: leadAny.metadata || {},
            closingData: leadAny.closingData || {},

            history: [],

            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt,
            callAttempts: lead.callAttempts,
            score: lead.score,
            source: lead.source as any
        } as Lead;
    }

    private static async saveLead(lead: Lead, action: string, actorId: string, details?: any) {
        // Log Activity to LeadActivity Table
        try {
            await prisma.leadActivity.create({
                data: {
                    leadId: lead.id,
                    userId: actorId === 'system' ? 'demo-user' : actorId,
                    type: 'STATUS_CHANGE',
                    content: action,
                    metadata: JSON.stringify({
                        previousStage: lead.salesStage,
                        ...details
                    })
                }
            });
        } catch (e) {
            console.warn("Failed to log activity:", e);
        }

        // Persist Lead Updates
        const updated = await prisma.lead.update({
            where: { id: lead.id },
            data: {
                status: lead.status,
                salesStage: lead.salesStage,
                closingData: lead.closingData as any, // Json
                metadata: lead.metadata as any,       // Json
                updatedAt: new Date()
            }
        });
        const updatedAny = updated as any;

        // Return domain object
        return {
            id: updated.id,
            organizationId: updated.organisationId,
            firstName: updated.firstName,
            lastName: updated.lastName,
            email: updated.email,
            phone: updated.phone,
            status: updated.status as any,
            salesStage: updated.salesStage as any,
            metadata: updatedAny.metadata || {},
            closingData: updatedAny.closingData || {},
            history: [],
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
            callAttempts: updated.callAttempts,
            score: updated.score,
            source: updated.source as any
        } as Lead;
    }

    // --- 1. QUALIFICATION WORKFLOW ---

    static async qualifyRdv(leadId: string, honored: boolean, actorId: string, details?: { absenceReason?: string }): Promise<Lead> {
        const lead = await this.getLead(leadId);

        if (!honored) {
            if (!details?.absenceReason) throw new Error('Motif d\'absence obligatoire');

            lead.salesStage = SalesStage.RDV_NON_HONORE;
            if (!lead.metadata) lead.metadata = {};
            lead.metadata.relanceCount = (lead.metadata.relanceCount || 0);

            lead.closingData = { ...lead.closingData, appointmentHonored: false, problemDescription: details.absenceReason };

            return this.saveLead(lead, 'RDV_NON_HONORE', actorId, { reason: details.absenceReason });
        } else {
            lead.closingData = { ...lead.closingData, appointmentHonored: true };
            return this.saveLead(lead, 'RDV_HONORE', actorId);
        }
    }

    static async handleQualificationDecision(leadId: string, decision: 'POURSUIVRE' | 'REPORTER' | 'ABANDON', actorId: string): Promise<Lead> {
        const lead = await this.getLead(leadId);

        if (decision === 'REPORTER') {
            lead.salesStage = SalesStage.DECISION_EN_ATTENTE;
            return this.saveLead(lead, 'DECISION_REPORTER', actorId);
        } else if (decision === 'ABANDON') {
            lead.salesStage = SalesStage.PERDU_NON_INTERESSE;
            return this.saveLead(lead, 'DECISION_ABANDON', actorId);
        } else {
            // POURSUIVRE
            lead.salesStage = SalesStage.CHOIX_FINANCEMENT;
            return this.saveLead(lead, 'DECISION_POURSUIVRE', actorId);
        }
    }

    // --- 2. FINANCEMENT WORKFLOW ---

    static async chooseFinancing(leadId: string, type: 'CPF' | 'PERSO', actorId: string): Promise<Lead> {
        const lead = await this.getLead(leadId);

        if (!lead.closingData) lead.closingData = {};
        lead.closingData.fundingType = type;

        // Routing
        if (type === 'PERSO') {
            lead.salesStage = SalesStage.OFFRE_COMMERCIALE;
        } else {
            lead.salesStage = SalesStage.VERIFICATION_COMPTE_CPF;
        }

        return this.saveLead(lead, `CHOIX_FINANCEMENT_${type}`, actorId);
    }

    // --- 3. PARCOURS PERSO ---

    static async validatePersoOffer(leadId: string, amount: number, thresholdPercent: number, actorId: string): Promise<Lead> {
        const lead = await this.getLead(leadId);

        lead.closingData = {
            ...lead.closingData,
            trainingPriceHt: amount,
            offerValidated: true,
            invoiceGenerated: true
        };

        if (!lead.metadata) lead.metadata = {};
        lead.metadata.paymentThreshold = thresholdPercent;

        lead.salesStage = SalesStage.PAIEMENT;

        return this.saveLead(lead, 'OFFRE_PERSO_VALIDEE', actorId, { amount, threshold: thresholdPercent });
    }

    static async recordPersoPayment(leadId: string, amountPaid: number, actorId: string): Promise<Lead> {
        const lead = await this.getLead(leadId);

        const total = lead.closingData?.trainingPriceHt || 0;
        const currentPaid = (lead.metadata?.totalPaid || 0) + amountPaid;
        const thresholdPercent = lead.metadata?.paymentThreshold || 30;
        const thresholdAmount = total * (thresholdPercent / 100);

        if (!lead.metadata) lead.metadata = {};
        lead.metadata.totalPaid = currentPaid;

        if (currentPaid >= thresholdAmount) {
            lead.salesStage = SalesStage.INSCRIT_PERSO;
            lead.status = LeadStatus.QUALIFIED; // Legacy compatible, or WON

            lead.metadata.kitSent = true;

            return this.saveLead(lead, 'PAIEMENT_SEUIL_ATTEINT', actorId, { paid: currentPaid, status: 'INSCRIT' });
        }

        return this.saveLead(lead, 'PAIEMENT_PARTIEL', actorId, { paid: currentPaid, remainingToThreshold: thresholdAmount - currentPaid });
    }

    // --- 4. PARCOURS CPF ---

    static async setCpfAccountStatus(leadId: string, isActive: boolean, actorId: string): Promise<Lead> {
        const lead = await this.getLead(leadId);

        if (isActive) {
            lead.salesStage = SalesStage.TEST_POSITIONNEMENT;
        } else {
            lead.salesStage = SalesStage.IDENTITE_NUMERIQUE;
        }

        lead.closingData = { ...lead.closingData, cpfAccess: isActive ? 'YES' : 'NO' };

        return this.saveLead(lead, `CPF_COMPTE_${isActive ? 'ACTIF' : 'INACTIF'}`, actorId);
    }

    static async validateCpfPositioningTest(leadId: string, score: number, actorId: string): Promise<Lead> {
        const lead = await this.getLead(leadId);

        lead.closingData = { ...lead.closingData, testScore: score };
        lead.salesStage = SalesStage.EN_ATTENTE_VALIDATION_CDC;

        return this.saveLead(lead, 'TEST_POSITIONNEMENT_VALIDE', actorId, { score });
    }

    static async validateCdcFile(leadId: string, actorId: string): Promise<Lead> {
        const lead = await this.getLead(leadId);

        lead.salesStage = SalesStage.INSCRIT_CPF;
        lead.closingData = { ...lead.closingData, cpfVerificationStatus: 'VALIDATED' };

        return this.saveLead(lead, 'DOSSIER_CDC_VALIDE', actorId);
    }

    // --- 5. GESTION RELANCES ---

    static async processRelance(leadId: string, actorId: string): Promise<Lead> {
        const lead = await this.getLead(leadId);

        if (!lead.metadata) lead.metadata = {};
        const count = (lead.metadata.relanceCount || 0) + 1;
        lead.metadata.relanceCount = count;

        if (count >= 3) {
            lead.salesStage = SalesStage.PERDU_HORS_LIGNE;
            return this.saveLead(lead, 'ABANDON_HORS_LIGNE', actorId, { count });
        }

        return this.saveLead(lead, 'RELANCE_EFFECTUEE', actorId, { count });
    }
}
