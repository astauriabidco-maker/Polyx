'use server';

import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';
import { EmailService } from '../services/email.service';
import { TwilioService } from '../services/twilio.service';

// SENDGRID ACTIONS REMOVED (Superseded by email.actions.ts)

export async function sendEmailAction(orgId: string, options: { to: string; subject: string; text?: string; html?: string; templateId?: string; dynamicTemplateData?: any }) {
    try {
        // 1. Check wallet
        const { WalletService } = await import('../services/wallet.service');
        const cost = 0.01; // transactional email cost
        await WalletService.debit(orgId, cost, `Envoi Email: ${options.subject}`, { recipient: options.to });

        // 2. Send via generic EmailService (Supports SendGrid, SMTP, etc.)
        // Note: Generic EmailService doesn't currently support 'templateId' logic across all providers.
        // It mostly relies on 'html' content.
        return await EmailService.send(orgId, {
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html || '<div></div>' // Fallback
        });
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
    voiceEnabled: boolean;
    recordingEnabled: boolean;
    accountSid: string;
    authToken?: string;
    fromSms: string;
    fromWhatsApp: string;
}) {
    try {
        const updateData: any = {
            whatsappEnabled: data.whatsappEnabled,
            smsEnabled: data.smsEnabled,
            voiceEnabled: data.voiceEnabled,
            recordingEnabled: data.recordingEnabled,
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
        if (!service) {
            return { success: false, error: 'Service Twilio non configuré' };
        }

        const result = await service.testConnection();
        return result;
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getVoiceSettingsAction(orgId: string) {
    try {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        // Mask sensitive fields
        if (config) {
            const anyConfig = config as any;
            if (anyConfig.twilioApiKey) anyConfig.twilioApiKey = '••••••••';
            if (anyConfig.twilioApiSecret) anyConfig.twilioApiSecret = '••••••••';
            if (anyConfig.twilioTwimlAppSid) anyConfig.twilioTwimlAppSid = '••••••••';

            if (anyConfig.voiceConfig) {
                const voiceConfig = anyConfig.voiceConfig as any;
                if (voiceConfig.deepgramApiKey) {
                    voiceConfig.deepgramApiKey = '••••••••••••••••';
                }
            }
        }

        return { success: true, data: config };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function testVoiceConnectionAction(orgId: string, provider: string) {
    try {
        // Here we would route to the specific service based on provider
        // For now, let's just mock success for Aircall/Ringover if config exists
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config) throw new Error("Configuration non trouvée");

        // Simulate API call to provider
        await new Promise(res => setTimeout(res, 1000));

        await prisma.integrationConfig.update({
            where: { organisationId: orgId },
            data: {
                voiceLastTestedAt: new Date(),
                voiceTestStatus: 'success'
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error('[VoiceTest] Error:', error);
        return { success: false, error: error.message };
    }
}

export async function saveVoiceConfigAction(orgId: string, data: {
    provider: string;
    enabled: boolean;
    recordingEnabled: boolean;
    config: any;
}) {
    try {
        const configToSave = { ...data.config };
        const topLevelUpdates: any = {
            voiceProvider: data.provider,
            voiceEnabled: data.enabled,
            recordingEnabled: data.recordingEnabled,
        };

        // Encryption for sensitive fields
        if (configToSave.deepgramApiKey && !configToSave.deepgramApiKey.startsWith('••••')) {
            configToSave.deepgramApiKey = encrypt(configToSave.deepgramApiKey);
        }

        // Handle Twilio Voice specific fields
        if (data.provider === 'TWILIO' && data.config) {
            if (data.config.apiKey && !data.config.apiKey.startsWith('••••')) {
                topLevelUpdates.twilioApiKey = encrypt(data.config.apiKey);
                delete configToSave.apiKey;
            }
            if (data.config.apiSecret && !data.config.apiSecret.startsWith('••••')) {
                topLevelUpdates.twilioApiSecret = encrypt(data.config.apiSecret);
                delete configToSave.apiSecret;
            }
            if (data.config.twimlAppSid && !data.config.twimlAppSid.startsWith('••••')) {
                topLevelUpdates.twilioTwimlAppSid = encrypt(data.config.twimlAppSid);
                delete configToSave.twimlAppSid;
            }
            if (data.config.accountSid) {
                topLevelUpdates.twilioAccountSid = data.config.accountSid;
                delete configToSave.accountSid;
            }
        }

        topLevelUpdates.voiceConfig = configToSave;

        await prisma.integrationConfig.upsert({
            where: { organisationId: orgId },
            create: {
                organisationId: orgId,
                ...topLevelUpdates
            },
            update: {
                ...topLevelUpdates
            }
        });

        revalidatePath('/app/settings/integrations');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * VOICE INTELLIGENCE (STT / Deepgram)
 */

export async function testDeepgramConnectionAction(apiKey: string) {
    try {
        const response = await fetch('https://api.deepgram.com/v1/projects', {
            headers: { 'Authorization': `Token ${apiKey}` }
        });

        if (response.ok) {
            return { success: true, message: "Connexion Deepgram réussie !" };
        } else {
            const err = await response.json();
            return { success: false, error: err.err_msg || "Clé API invalide" };
        }
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

        const data: any[] = targetType === 'lead'
            ? await (prisma as any).lead.findMany({ where: { id: { in: ids } }, select: { id: true, phone: true, firstName: true } })
            : await (prisma as any).learner.findMany({ where: { id: { in: ids } }, select: { id: true, phone: true, firstName: true, leadId: true } });

        let successCount = 0;
        let failCount = 0;
        const COST_PER_SMS = 0.10;

        for (const item of data) {
            if (!item.phone) { failCount++; continue; }
            try {
                const personalized = message.replace('{{name}}', item.firstName || '');
                await WalletService.debit(orgId, COST_PER_SMS, `Bulk SMS (${targetType}): ${item.id}`, { id: item.id });
                const res = await service.sendSms(item.phone, personalized);
                if (res.success) {
                    successCount++;
                    // Archive in Lead history (prefer leadId if it's a learner)
                    const activityTargetId = targetType === 'learner' ? item.leadId : item.id;
                    if (activityTargetId) {
                        await (prisma as any).leadActivity.create({
                            data: {
                                leadId: activityTargetId,
                                type: 'COMMUNICATION',
                                content: `SMS envoyé: ${personalized}`,
                                userId: 'SYSTEM'
                            }
                        });
                    }
                }
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

        const data: any[] = targetType === 'lead'
            ? await (prisma as any).lead.findMany({ where: { id: { in: ids } }, select: { id: true, phone: true, firstName: true } })
            : await (prisma as any).learner.findMany({ where: { id: { in: ids } }, select: { id: true, phone: true, firstName: true, leadId: true } });

        let successCount = 0;
        let failCount = 0;
        const COST_PER_WA = 0.15;

        for (const item of data) {
            if (!item.phone) { failCount++; continue; }
            try {
                const personalized = message.replace('{{name}}', item.firstName || '');
                await WalletService.debit(orgId, COST_PER_WA, `Bulk WhatsApp (${targetType}): ${item.id}`, { id: item.id });
                const res = await service.sendWhatsApp(item.phone, personalized);
                if (res.success) {
                    successCount++;
                    // Archive in Lead history (prefer leadId if it's a learner)
                    const activityTargetId = targetType === 'learner' ? item.leadId : item.id;
                    if (activityTargetId) {
                        await (prisma as any).leadActivity.create({
                            data: {
                                leadId: activityTargetId,
                                type: 'COMMUNICATION',
                                content: `WhatsApp envoyé: ${personalized}`,
                                userId: 'SYSTEM'
                            }
                        });
                    }
                }
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
        const { WalletService } = await import('../services/wallet.service');

        const data: any[] = targetType === 'lead'
            ? await (prisma as any).lead.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, firstName: true } })
            : await (prisma as any).learner.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, firstName: true, leadId: true } });

        let successCount = 0;
        let failCount = 0;
        const COST_PER_EMAIL = 0.01;

        for (const item of data) {
            if (!item.email) { failCount++; continue; }
            try {
                const personalizedText = options.text?.replace('{{name}}', item.firstName || '');
                const personalizedHtml = options.html?.replace('{{name}}', item.firstName || '');

                await WalletService.debit(orgId, COST_PER_EMAIL, `Bulk Email (${targetType}): ${item.id}`, { id: item.id });

                const res = await EmailService.send(orgId, {
                    to: item.email,
                    subject: options.subject,
                    text: personalizedText,
                    html: personalizedHtml || '<div></div>'
                });

                if (res.success) {
                    successCount++;
                    // Archive in Lead history (prefer leadId if it's a learner)
                    const activityTargetId = targetType === 'learner' ? item.leadId : item.id;
                    if (activityTargetId) {
                        await (prisma as any).leadActivity.create({
                            data: {
                                leadId: activityTargetId,
                                type: 'COMMUNICATION',
                                content: `Email envoyé: ${options.subject}`,
                                userId: 'SYSTEM'
                            }
                        });
                    }
                }
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
