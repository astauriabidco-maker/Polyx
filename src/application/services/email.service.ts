
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import type { IntegrationConfig } from '@prisma/client';

export type EmailProvider = 'SENDGRID' | 'BREVO' | 'RESEND';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export class EmailService {

    /**
     * Sends an email using the configured provider.
     */
    static async send(orgId: string, options: EmailOptions): Promise<{ success: boolean; error?: string }> {
        // 1. Fetch Config
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config || !config.emailEnabled) {
            console.warn(`[EmailService] Email sending disabled regarding org ${orgId}`);
            // Fallback to console log in dev
            console.log('--- 📧 EMAIL SYSTEM DISABLED (LOG ONLY) ---');
            console.log(`To: ${options.to}`);
            console.log(`Subject: ${options.subject}`);
            return { success: false, error: "Email integration disabled" };
        }

        const provider = config.emailProvider as EmailProvider;
        const apiKey = config.emailApiKey ? decrypt(config.emailApiKey) : null;
        const fromEmail = config.emailFromAddress || 'noreply@polyx.app';
        const fromName = config.emailFromName || 'Polyx Notification';

        if (!apiKey) {
            return { success: false, error: "Missing API Key" };
        }

        try {
            switch (provider) {
                case 'SENDGRID':
                    return await this.sendViaSendGrid(apiKey, fromEmail, fromName, options);
                case 'BREVO':
                    return await this.sendViaBrevo(apiKey, fromEmail, fromName, options);
                case 'RESEND':
                    return await this.sendViaResend(apiKey, fromEmail, fromName, options);
                default:
                    return { success: false, error: "Unsupported provider" };
            }
        } catch (error: any) {
            console.error(`[EmailService] Error sending via ${provider}:`, error);
            return { success: false, error: error.message || "Unknown error" };
        }
    }

    /**
     * SendGrid Implementation
     */
    private static async sendViaSendGrid(apiKey: string, fromEmail: string, fromName: string, options: EmailOptions) {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: options.to }] }],
                from: { email: fromEmail, name: fromName },
                subject: options.subject,
                content: [{ type: 'text/html', value: options.html }]
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`SendGrid Error: ${JSON.stringify(err)}`);
        }

        return { success: true };
    }

    /**
     * Brevo (Sendinblue) Implementation
     */
    private static async sendViaBrevo(apiKey: string, fromEmail: string, fromName: string, options: EmailOptions) {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sender: { email: fromEmail, name: fromName },
                to: [{ email: options.to }],
                subject: options.subject,
                htmlContent: options.html
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Brevo Error: ${JSON.stringify(err)}`);
        }

        return { success: true };
    }

    /**
     * Resend Implementation
     */
    private static async sendViaResend(apiKey: string, fromEmail: string, fromName: string, options: EmailOptions) {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: `${fromName} <${fromEmail}>`,
                to: [options.to],
                subject: options.subject,
                html: options.html
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Resend Error: ${JSON.stringify(err)}`);
        }

        return { success: true };
    }

    /**
     * Test Connection Utility
     */
    static async testConnection(orgId: string, testEmail: string): Promise<{ success: boolean, error?: string }> {
        return this.send(orgId, {
            to: testEmail,
            subject: 'Test de connexion Polyx',
            html: '<p>Ceci est un email de test pour valider votre configuration SMTP.</p>'
        });
    }
}
