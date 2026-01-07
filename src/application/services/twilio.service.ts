/**
 * Twilio Service
 * Handles SMS and WhatsApp messaging via Twilio API
 */
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

interface TwilioConfig {
    accountSid: string;
    authToken: string;
    fromSms: string;
    fromWhatsApp: string;
}

export class TwilioService {
    private config: TwilioConfig;
    private baseUrl: string;

    private constructor(config: TwilioConfig) {
        this.config = config;
        this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}`;
    }

    static async create(orgId: string): Promise<TwilioService | null> {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        }) as any;

        // Use fields from schema (some might be shared with whatsappEnabled or smsEnabled)
        if (!config?.twilioAccountSid || !config.twilioAuthToken) {
            return null;
        }

        return new TwilioService({
            accountSid: config.twilioAccountSid,
            authToken: decrypt(config.twilioAuthToken),
            fromSms: config.twilioSmsFrom || '',
            fromWhatsApp: config.twilioWhatsappNumber || ''
        });
    }

    /**
     * Send an SMS
     */
    async sendSms(to: string, message: string): Promise<{ success: boolean; sid?: string; error?: string }> {
        return this.sendMessage(to, message, this.config.fromSms);
    }

    /**
     * Send a WhatsApp message
     */
    async sendWhatsApp(to: string, message: string): Promise<{ success: boolean; sid?: string; error?: string }> {
        const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
        const formattedFrom = this.config.fromWhatsApp.startsWith('whatsapp:')
            ? this.config.fromWhatsApp
            : `whatsapp:${this.config.fromWhatsApp}`;

        return this.sendMessage(formattedTo, message, formattedFrom);
    }

    private async sendMessage(to: string, body: string, from: string): Promise<{ success: boolean; sid?: string; error?: string }> {
        try {
            const auth = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64');

            const response = await fetch(`${this.baseUrl}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    To: to,
                    From: from,
                    Body: body
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Twilio Error: ${response.status}`);
            }

            return { success: true, sid: data.sid };
        } catch (error: any) {
            console.error('[TwilioService] Error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Test connection
     */
    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            const auth = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64');
            const response = await fetch(`${this.baseUrl}.json`, {
                headers: { 'Authorization': `Basic ${auth}` }
            });

            if (!response.ok) {
                throw new Error('Invalid Twilio Credentials');
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
