'use server';

import { CrmWorkflowService } from '@/application/services/crm-workflow.service';
import { Lead } from '@/domain/entities/lead';

// --- WRAPPERS FOR SERVER ACTIONS ---
// These actions handle the boundary between Client and Server (serialization, error handling)

export async function qualifyRdvAction(leadId: string, honored: boolean, details?: { absenceReason?: string }) {
    try {
        const lead = await CrmWorkflowService.qualifyRdv(leadId, honored, 'system-user', details);
        return { success: true, lead };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function handleQualificationDecisionAction(leadId: string, decision: 'POURSUIVRE' | 'REPORTER' | 'ABANDON') {
    try {
        const lead = await CrmWorkflowService.handleQualificationDecision(leadId, decision, 'system-user');
        return { success: true, lead };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function chooseFinancingAction(leadId: string, type: 'CPF' | 'PERSO') {
    try {
        const lead = await CrmWorkflowService.chooseFinancing(leadId, type, 'system-user');
        return { success: true, lead };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function validatePersoOfferAction(leadId: string, amount: number, thresholdPercent: number) {
    try {
        const lead = await CrmWorkflowService.validatePersoOffer(leadId, amount, thresholdPercent, 'system-user');
        return { success: true, lead };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function recordPersoPaymentAction(leadId: string, amountPaid: number) {
    try {
        const lead = await CrmWorkflowService.recordPersoPayment(leadId, amountPaid, 'system-user');
        return { success: true, lead };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function setCpfAccountStatusAction(leadId: string, isActive: boolean) {
    try {
        const lead = await CrmWorkflowService.setCpfAccountStatus(leadId, isActive, 'system-user');
        return { success: true, lead };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function validateCpfPositioningTestAction(leadId: string, score: number) {
    try {
        const lead = await CrmWorkflowService.validateCpfPositioningTest(leadId, score, 'system-user');
        return { success: true, lead };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function validateCdcFileAction(leadId: string) {
    try {
        const lead = await CrmWorkflowService.validateCdcFile(leadId, 'system-user');
        return { success: true, lead };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function processRelanceAction(leadId: string) {
    try {
        const lead = await CrmWorkflowService.processRelance(leadId, 'system-user');
        return { success: true, lead };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
