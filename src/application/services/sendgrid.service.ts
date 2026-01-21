/**
 * SendGrid Service
 * Handles transactional emailing via SendGrid API
 */
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

interface SendGridConfig {
    apiKey: string;
    fromEmail: string;
    fromName: string;
}

interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    templateId?: string;
    dynamicTemplateData?: Record<string, any>;
}

export class SendGridService {
    private config: SendGridConfig;

    private constructor(config: SendGridConfig) {
        this.config = config;
    }

    static async create(orgId: string): Promise<SendGridService | null> {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        }) as any;

        if (!config?.emailEnabled || config.emailProvider !== 'SENDGRID' || !config.emailApiKey) {
            return null;
        }

        return new SendGridService({
            apiKey: decrypt(config.emailApiKey),
            fromEmail: config.emailFromAddress || '',
            fromName: config.emailFromName || ''
        });
    }

    /**
     * Send an email
     */
    async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            const body: any = {
                personalizations: [{
                    to: [{ email: options.to }]
                }],
                from: {
                    email: this.config.fromEmail,
                    name: this.config.fromName
                },
                subject: options.subject
            };

            if (options.templateId) {
                body.template_id = options.templateId;
                body.personalizations[0].dynamic_template_data = options.dynamicTemplateData;
            } else {
                body.content = [
                    { type: 'text/plain', value: options.text || '' },
                    { type: 'text/html', value: options.html || options.text || '' }
                ];
            }

            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.errors?.[0]?.message || `SendGrid Error: ${response.status}`);
            }

            return { success: true, messageId: response.headers.get('X-Message-Id') || 'success' };
        } catch (error: any) {
            console.error('[SendGridService] Error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Test connection
     */
    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            // Verify API key by trying to fetch scopes or user profile
            const response = await fetch('https://api.sendgrid.com/v3/scopes', {
                headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
            });

            if (!response.ok) {
                throw new Error('Invalid SendGrid API Key');
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
