'use server';

import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';
import { SendGridService } from '../services/sendgrid.service';
import { TwilioService } from '../services/twilio.service';

/**
 * SENDGRID ACTIONS
 */

export async function getSendGridSettingsAction(orgId: string) {
    try {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });
        return { success: true, data: config };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function saveSendGridConfigAction(orgId: string, data: {
    enabled: boolean;
    apiKey?: string;
    fromEmail: string;
    fromName: string;
}) {
    try {
        const updateData: any = {
            emailEnabled: data.enabled,
            emailProvider: 'SENDGRID',
            emailFromAddress: data.fromEmail,
            emailFromName: data.fromName,
        };

        if (data.apiKey) {
            updateData.emailApiKey = encrypt(data.apiKey);
        }

        await prisma.integrationConfig.upsert({
            where: { organisationId: orgId },
            create: { organisationId: orgId, ...updateData },
            update: updateData
        });

        revalidatePath('/app/settings/integrations');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function testSendGridConnectionAction(orgId: string) {
    try {
        const service = await SendGridService.create(orgId);
        if (!service) throw new Error("Service non configuré");

        const res = await service.testConnection();

        await prisma.integrationConfig.update({
            where: { organisationId: orgId },
            data: {
                emailLastTestedAt: new Date(),
                emailTestStatus: res.success ? 'success' : 'failed'
            } as any
        });

        return res;
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function sendEmailAction(orgId: string, options: { to: string; subject: string; text?: string; html?: string; templateId?: string; dynamicTemplateData?: any }) {
    try {
        const service = await SendGridService.create(orgId);
        if (!service) throw new Error("Service SendGrid non configuré");

        // 1. Check wallet
        const { WalletService } = await import('../services/wallet.service');
        const cost = 0.01; // transactional email cost
        await WalletService.debit(orgId, cost, `Envoi Email: ${options.subject}`, { recipient: options.to });

        // 2. Send
        return await service.sendEmail(options);
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * TWILIO ACTIONS
 */

export async function getTwilioSettingsAction(orgId: string) {
    try {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });
        return { success: true, data: config };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function saveTwilioConfigAction(orgId: string, data: {
    whatsappEnabled: boolean;
    smsEnabled: boolean;
    accountSid: string;
    authToken?: string;
    fromSms: string;
    fromWhatsApp: string;
}) {
    try {
        const updateData: any = {
            whatsappEnabled: data.whatsappEnabled,
            smsEnabled: data.smsEnabled,
            twilioAccountSid: data.accountSid,
            twilioSmsFrom: data.fromSms,
            twilioWhatsappNumber: data.fromWhatsApp,
        };

        if (data.authToken) {
            updateData.twilioAuthToken = encrypt(data.authToken);
        }

        await prisma.integrationConfig.upsert({
            where: { organisationId: orgId },
            create: { organisationId: orgId, ...updateData },
            update: updateData
        });

        revalidatePath('/app/settings/integrations');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function testTwilioConnectionAction(orgId: string) {
    try {
        const service = await TwilioService.create(orgId);
        if (!service) throw new Error("Service non configuré");

        const res = await service.testConnection();

        await prisma.integrationConfig.update({
            where: { organisationId: orgId },
            data: {
                whatsappLastTestedAt: new Date(),
                whatsappTestStatus: res.success ? 'success' : 'failed',
                smsLastTestedAt: new Date(),
                smsTestStatus: res.success ? 'success' : 'failed'
            } as any
        });

        return res;
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function sendWhatsAppAction(orgId: string, to: string, message: string) {
    try {
        const service = await TwilioService.create(orgId);
        if (!service) throw new Error("Service Twilio non configuré");

        return await service.sendWhatsApp(to, message);
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function sendSmsAction(orgId: string, to: string, message: string) {
    try {
        const service = await TwilioService.create(orgId);
        if (!service) throw new Error("Service Twilio non configuré");

        return await service.sendSms(to, message);
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * BULK ACTIONS
 */

export async function sendBulkSmsAction(orgId: string, ids: string[], message: string, targetType: 'lead' | 'learner' = 'lead') {
    try {
        const service = await TwilioService.create(orgId);
        if (!service) throw new Error("Service Twilio non configuré");

        const { WalletService } = await import('../services/wallet.service');

        const data = targetType === 'lead'
            ? await prisma.lead.findMany({ where: { id: { in: ids } }, select: { id: true, phone: true, firstName: true } })
            : await prisma.learner.findMany({ where: { id: { in: ids } }, select: { id: true, phone: true, firstName: true } });

        let successCount = 0;
        let failCount = 0;
        const COST_PER_SMS = 0.10;

        for (const item of data) {
            if (!item.phone) { failCount++; continue; }
            try {
                const personalized = message.replace('{{name}}', item.firstName || '');
                await WalletService.debit(orgId, COST_PER_SMS, `Bulk SMS (${targetType}): ${item.id}`, { id: item.id });
                const res = await service.sendSms(item.phone, personalized);
                if (res.success) successCount++;
                else failCount++;
            } catch (err) {
                failCount++;
            }
        }

        return { success: true, summary: { total: data.length, success: successCount, failed: failCount } };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function sendBulkWhatsAppAction(orgId: string, ids: string[], message: string, targetType: 'lead' | 'learner' = 'lead') {
    try {
        const service = await TwilioService.create(orgId);
        if (!service) throw new Error("Service Twilio non configuré");

        const { WalletService } = await import('../services/wallet.service');

        const data = targetType === 'lead'
            ? await prisma.lead.findMany({ where: { id: { in: ids } }, select: { id: true, phone: true, firstName: true } })
            : await prisma.learner.findMany({ where: { id: { in: ids } }, select: { id: true, phone: true, firstName: true } });

        let successCount = 0;
        let failCount = 0;
        const COST_PER_WA = 0.15;

        for (const item of data) {
            if (!item.phone) { failCount++; continue; }
            try {
                const personalized = message.replace('{{name}}', item.firstName || '');
                await WalletService.debit(orgId, COST_PER_WA, `Bulk WhatsApp (${targetType}): ${item.id}`, { id: item.id });
                const res = await service.sendWhatsApp(item.phone, personalized);
                if (res.success) successCount++;
                else failCount++;
            } catch (err) {
                failCount++;
            }
        }

        return { success: true, summary: { total: data.length, success: successCount, failed: failCount } };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function sendBulkEmailAction(orgId: string, ids: string[], options: { subject: string; text?: string; html?: string; templateId?: string }, targetType: 'lead' | 'learner' = 'lead') {
    try {
        const service = await SendGridService.create(orgId);
        if (!service) throw new Error("Service SendGrid non configuré");

        const { WalletService } = await import('../services/wallet.service');

        const data = targetType === 'lead'
            ? await prisma.lead.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, firstName: true } })
            : await prisma.learner.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, firstName: true } });

        let successCount = 0;
        let failCount = 0;
        const COST_PER_EMAIL = 0.01;

        for (const item of data) {
            if (!item.email) { failCount++; continue; }
            try {
                const personalizedText = options.text?.replace('{{name}}', item.firstName || '');
                const personalizedHtml = options.html?.replace('{{name}}', item.firstName || '');

                await WalletService.debit(orgId, COST_PER_EMAIL, `Bulk Email (${targetType}): ${item.id}`, { id: item.id });
                const res = await service.sendEmail({
                    to: item.email,
                    subject: options.subject,
                    text: personalizedText,
                    html: personalizedHtml,
                    templateId: options.templateId,
                    dynamicTemplateData: { name: item.firstName || '' }
                });

                if (res.success) successCount++;
                else failCount++;
            } catch (err) {
                failCount++;
            }
        }

        return { success: true, summary: { total: data.length, success: successCount, failed: failCount } };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getWhatsAppTemplatesAction(orgId: string) {
    // For now, return a default template or mock data
    // In a real app, this would fetch templates from Twilio/Meta API
    return {
        success: true,
        data: [
            { id: 'welcome', name: 'Souhaiter la bienvenue', content: 'Bonjour {{name}}, bienvenue chez {{company}} !' },
            { id: 'appointment_reminder', name: 'Rappel de rendez-vous', content: 'Bonjour {{name}}, nous vous rappelons votre RDV le {{date}} à {{time}}.' }
        ]
    };
}
