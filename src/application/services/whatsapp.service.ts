/**
 * WhatsApp Business Integration Service
 * Supports both Twilio and Meta Cloud API (direct)
 * 
 * Configuration:
 * - Option A (Twilio): Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER
 * - Option B (Meta):   Set WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN
 */

export interface WhatsAppMessage {
    to: string;
    body: string;
    templateName?: string;
    variables?: Record<string, string>;
}

export interface WhatsAppResult {
    success: boolean;
    messageId?: string;
    error?: string;
    provider?: 'twilio' | 'meta' | 'simulation';
}

type WhatsAppProvider = 'twilio' | 'meta' | 'simulation';

export class WhatsAppService {

    /**
     * Detect which provider is configured based on environment variables
     * Fallback method when no orgId is provided
     */
    private static getProviderFromEnv(): WhatsAppProvider {
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            return 'twilio';
        }
        if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
            return 'meta';
        }
        return 'simulation';
    }

    /**
     * Send a WhatsApp message using the configured provider
     * If orgId is provided, credentials are fetched from encrypted database
     * Otherwise, falls back to environment variables
     */
    static async sendMessage(data: WhatsAppMessage, orgId?: string): Promise<WhatsAppResult> {
        let config: any = null;
        let provider: WhatsAppProvider = 'simulation';

        // Try to get config from database if orgId provided
        if (orgId) {
            try {
                const { getDecryptedWhatsAppConfig } = await import('@/application/actions/integration.actions');
                config = await getDecryptedWhatsAppConfig(orgId);
                if (config) {
                    provider = config.provider;
                }
            } catch (e) {
                console.warn('[WHATSAPP] Could not load org config, falling back to env');
            }
        }

        // Fallback to environment variables
        if (!config) {
            provider = this.getProviderFromEnv();
        }

        console.log(`[WHATSAPP] 📱 Provider: ${provider.toUpperCase()} | Sending to ${data.to}...`);

        switch (provider) {
            case 'twilio':
                return config
                    ? this.sendViaTwilioWithConfig(data, config.accountSid, config.authToken, config.whatsappNumber)
                    : this.sendViaTwilio(data);
            case 'meta':
                return config
                    ? this.sendViaMetaWithConfig(data, config.phoneNumberId, config.accessToken)
                    : this.sendViaMeta(data);
            default:
                return this.sendSimulation(data);
        }
    }

    /**
     * TWILIO WHATSAPP API
     * Requires: npm install twilio (optional, using fetch for simplicity)
     */
    private static async sendViaTwilio(data: WhatsAppMessage): Promise<WhatsAppResult> {
        try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID!;
            const authToken = process.env.TWILIO_AUTH_TOKEN!;
            const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

            // Format the recipient number
            const toNumber = data.to.startsWith('whatsapp:') ? data.to : `whatsapp:${data.to}`;

            // Twilio API endpoint
            const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

            const formData = new URLSearchParams();
            formData.append('From', fromNumber);
            formData.append('To', toNumber);
            formData.append('Body', data.body);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            });

            const result = await response.json();

            if (result.sid) {
                console.log(`[WHATSAPP] ✅ Twilio Message sent: ${result.sid}`);
                return { success: true, messageId: result.sid, provider: 'twilio' };
            } else {
                console.error(`[WHATSAPP] ❌ Twilio Error:`, result);
                return { success: false, error: result.message || 'Twilio send failed', provider: 'twilio' };
            }

        } catch (error: any) {
            console.error('[WHATSAPP] Twilio Exception:', error);
            return { success: false, error: error.message, provider: 'twilio' };
        }
    }

    /**
     * META CLOUD API (Direct WhatsApp Business Platform)
     * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
     */
    private static async sendViaMeta(data: WhatsAppMessage): Promise<WhatsAppResult> {
        try {
            const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
            const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;

            // Format recipient (remove + and spaces)
            const recipient = data.to.replace(/[^0-9]/g, '');

            const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

            // Build request body
            let requestBody: any;

            if (data.templateName) {
                // Template-based message (for initial outreach)
                requestBody = {
                    messaging_product: 'whatsapp',
                    to: recipient,
                    type: 'template',
                    template: {
                        name: data.templateName,
                        language: { code: 'fr' },
                        components: data.variables ? [
                            {
                                type: 'body',
                                parameters: Object.values(data.variables).map(v => ({ type: 'text', text: v }))
                            }
                        ] : []
                    }
                };
            } else {
                // Free-form text message (only for 24h response window)
                requestBody = {
                    messaging_product: 'whatsapp',
                    to: recipient,
                    type: 'text',
                    text: { body: data.body }
                };
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (result.messages && result.messages[0]?.id) {
                console.log(`[WHATSAPP] ✅ Meta Message sent: ${result.messages[0].id}`);
                return { success: true, messageId: result.messages[0].id, provider: 'meta' };
            } else {
                console.error(`[WHATSAPP] ❌ Meta Error:`, result);
                return { success: false, error: result.error?.message || 'Meta send failed', provider: 'meta' };
            }

        } catch (error: any) {
            console.error('[WHATSAPP] Meta Exception:', error);
            return { success: false, error: error.message, provider: 'meta' };
        }
    }

    /**
     * SIMULATION MODE (No API configured)
     * Used for local development without real WhatsApp credentials
     */
    private static async sendSimulation(data: WhatsAppMessage): Promise<WhatsAppResult> {
        console.log(`[WHATSAPP] 🧪 SIMULATION MODE`);
        console.log(`[WHATSAPP] To: ${data.to}`);
        console.log(`[WHATSAPP] Body: "${data.body}"`);

        if (data.templateName) {
            console.log(`[WHATSAPP] Template: ${data.templateName}`);
        }

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        console.log(`[WHATSAPP] ✅ Simulated message sent`);
        return {
            success: true,
            messageId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            provider: 'simulation'
        };
    }

    /**
     * TWILIO with explicit credentials (from database)
     */
    private static async sendViaTwilioWithConfig(
        data: WhatsAppMessage,
        accountSid: string,
        authToken: string,
        fromNumber: string
    ): Promise<WhatsAppResult> {
        try {
            const toNumber = data.to.startsWith('whatsapp:') ? data.to : `whatsapp:${data.to}`;
            const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

            const formData = new URLSearchParams();
            formData.append('From', fromNumber);
            formData.append('To', toNumber);
            formData.append('Body', data.body);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            });

            const result = await response.json();

            if (result.sid) {
                console.log(`[WHATSAPP] ✅ Twilio Message sent: ${result.sid}`);
                return { success: true, messageId: result.sid, provider: 'twilio' };
            } else {
                console.error(`[WHATSAPP] ❌ Twilio Error:`, result);
                return { success: false, error: result.message || 'Twilio send failed', provider: 'twilio' };
            }
        } catch (error: any) {
            console.error('[WHATSAPP] Twilio Exception:', error);
            return { success: false, error: error.message, provider: 'twilio' };
        }
    }

    /**
     * META with explicit credentials (from database)
     */
    private static async sendViaMetaWithConfig(
        data: WhatsAppMessage,
        phoneNumberId: string,
        accessToken: string
    ): Promise<WhatsAppResult> {
        try {
            const recipient = data.to.replace(/[^0-9]/g, '');
            const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

            let requestBody: any;
            if (data.templateName) {
                requestBody = {
                    messaging_product: 'whatsapp',
                    to: recipient,
                    type: 'template',
                    template: {
                        name: data.templateName,
                        language: { code: 'fr' },
                        components: data.variables ? [
                            { type: 'body', parameters: Object.values(data.variables).map(v => ({ type: 'text', text: v })) }
                        ] : []
                    }
                };
            } else {
                requestBody = {
                    messaging_product: 'whatsapp',
                    to: recipient,
                    type: 'text',
                    text: { body: data.body }
                };
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (result.messages && result.messages[0]?.id) {
                console.log(`[WHATSAPP] ✅ Meta Message sent: ${result.messages[0].id}`);
                return { success: true, messageId: result.messages[0].id, provider: 'meta' };
            } else {
                console.error(`[WHATSAPP] ❌ Meta Error:`, result);
                return { success: false, error: result.error?.message || 'Meta send failed', provider: 'meta' };
            }
        } catch (error: any) {
            console.error('[WHATSAPP] Meta Exception:', error);
            return { success: false, error: error.message, provider: 'meta' };
        }
    }

    /**
     * Get a list of pre-defined professional templates
     * These should match your approved templates in Twilio/Meta dashboard
     */
    static getTemplates() {
        return [
            {
                id: 'first_contact',
                name: 'Prise de contact initiale',
                body: 'Bonjour {{firstName}}, c\'est {{senderName}} de {{orgName}}. J\'ai bien reçu votre demande d\'information pour la formation {{training}}. Seriez-vous disponible pour un court appel aujourd\'hui ?',
                metaTemplateName: 'polyx_first_contact'
            },
            {
                id: 'meeting_reminder',
                name: 'Rappel de rendez-vous',
                body: 'Bonjour {{firstName}}, simple rappel pour notre rendez-vous du {{date}} à {{time}}. Au plaisir d\'échanger avec vous !',
                metaTemplateName: 'polyx_meeting_reminder'
            },
            {
                id: 'follow_up',
                name: 'Relance dossier CPF',
                body: 'Bonjour {{firstName}}, je reviens vers vous concernant votre dossier CPF pour la formation {{training}}. Avez-vous pu valider votre inscription sur MonCompteFormation ?',
                metaTemplateName: 'polyx_cpf_followup'
            },
            {
                id: 'training_start',
                name: 'Démarrage formation',
                body: 'Bonjour {{firstName}} ! Votre formation {{training}} démarre bientôt. Voici vos accès : {{accessLink}}. À très vite !',
                metaTemplateName: 'polyx_training_start'
            },
            {
                id: 'satisfaction',
                name: 'Enquête de satisfaction',
                body: 'Bonjour {{firstName}}, nous espérons que votre formation {{training}} vous a été utile ! Pourriez-vous prendre 30 secondes pour nous donner votre avis ? {{surveyLink}}',
                metaTemplateName: 'polyx_satisfaction_survey'
            }
        ];
    }

    /**
     * Check if WhatsApp is properly configured (env-based check)
     */
    static isConfigured(): { configured: boolean; provider: WhatsAppProvider } {
        const provider = this.getProviderFromEnv();
        return {
            configured: provider !== 'simulation',
            provider
        };
    }
}

