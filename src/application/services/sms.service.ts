
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

export class SmsService {

    /**
     * Sends an SMS using the configured Twilio credentials.
     */
    static async send(orgId: string, to: string, body: string): Promise<{ success: boolean; error?: string }> {
        // 1. Fetch Config
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config || !config.smsEnabled) {
            console.warn(`[SmsService] SMS sending disabled for org ${orgId}`);
            console.log('--- 📱 MOCK SMS (LOG ONLY) ---');
            console.log(`To: ${to}`);
            console.log(`Body: ${body}`);
            return { success: false, error: "SMS integration disabled" };
        }

        // 2. Decrypt Credentials
        const accountSid = config.twilioAccountSid ? decrypt(config.twilioAccountSid) : null;
        const authToken = config.twilioAuthToken ? decrypt(config.twilioAuthToken) : null;
        const fromNumber = config.twilioSmsFrom;

        if (!accountSid || !authToken || !fromNumber) {
            return { success: false, error: "Missing Twilio credentials or Sender ID" };
        }

        try {
            // 3. Call Twilio API
            const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
            const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

            const formData = new URLSearchParams();
            formData.append('To', to);
            formData.append('From', fromNumber);
            formData.append('Body', body);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                console.error('[SmsService] Twilio Error:', err);
                throw new Error(err.message || 'Twilio API Error');
            }

            return { success: true };

        } catch (error: any) {
            console.error('[SmsService] Error sending SMS:', error);
            return { success: false, error: error.message || "Unknown error" };
        }
    }

    /**
     * Test Connection
     */
    static async testConnection(orgId: string, testPhone: string): Promise<{ success: boolean, error?: string }> {
        return this.send(orgId, testPhone, "Ceci est un SMS de test envoyé depuis Polyx. 🚀");
    }
}
