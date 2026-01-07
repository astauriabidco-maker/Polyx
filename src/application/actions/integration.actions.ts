'use server';

import { prisma } from '@/lib/prisma';
import { encrypt, decrypt, maskSensitive } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';

// ============================================
// GET INTEGRATION SETTINGS (with masked values)
// ============================================

export async function getIntegrationSettingsAction(orgId: string) {
    try {
        let config = await (prisma as any).integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        // Create default config if none exists
        if (!config) {
            config = await (prisma as any).integrationConfig.create({
                data: { organisationId: orgId }
            });
        }

        // Return masked values for display (never send real keys to client)
        return {
            success: true,
            data: {
                id: config.id,
                whatsappProvider: config.whatsappProvider,
                whatsappEnabled: config.whatsappEnabled,
                whatsappLastTestedAt: config.whatsappLastTestedAt,
                whatsappTestStatus: config.whatsappTestStatus,

                // Masked values for display only
                twilioAccountSid: maskSensitive(config.twilioAccountSid ? decrypt(config.twilioAccountSid) : null),
                twilioAuthToken: config.twilioAuthToken ? '••••••••••••••••' : null,
                twilioWhatsappNumber: config.twilioWhatsappNumber ? decrypt(config.twilioWhatsappNumber) : null,

                metaPhoneNumberId: maskSensitive(config.metaPhoneNumberId ? decrypt(config.metaPhoneNumberId) : null),
                metaAccessToken: config.metaAccessToken ? '••••••••••••••••' : null,

                // Flags for UI
                hasTwilioConfig: !!(config.twilioAccountSid && config.twilioAuthToken),
                hasMetaConfig: !!(config.metaPhoneNumberId && config.metaAccessToken)
            }
        };
    } catch (error) {
        console.error('[IntegrationAction] Error fetching settings:', error);
        return { success: false, error: 'Erreur lors de la récupération des paramètres.' };
    }
}

// ============================================
// SAVE WHATSAPP CONFIGURATION (Encrypted)
// ============================================

interface WhatsAppConfigInput {
    provider: 'twilio' | 'meta';
    // Twilio
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioWhatsappNumber?: string;
    // Meta
    metaPhoneNumberId?: string;
    metaAccessToken?: string;
}

export async function saveWhatsAppConfigAction(orgId: string, config: WhatsAppConfigInput) {
    try {
        const updateData: any = {
            whatsappProvider: config.provider,
            updatedAt: new Date()
        };

        if (config.provider === 'twilio') {
            // Only update if new values provided (not masked placeholders)
            if (config.twilioAccountSid && !config.twilioAccountSid.includes('•')) {
                updateData.twilioAccountSid = encrypt(config.twilioAccountSid);
            }
            if (config.twilioAuthToken && !config.twilioAuthToken.includes('•')) {
                updateData.twilioAuthToken = encrypt(config.twilioAuthToken);
            }
            if (config.twilioWhatsappNumber) {
                updateData.twilioWhatsappNumber = encrypt(config.twilioWhatsappNumber);
            }
            // Clear Meta credentials when switching to Twilio
            updateData.metaPhoneNumberId = null;
            updateData.metaAccessToken = null;
        } else if (config.provider === 'meta') {
            if (config.metaPhoneNumberId && !config.metaPhoneNumberId.includes('•')) {
                updateData.metaPhoneNumberId = encrypt(config.metaPhoneNumberId);
            }
            if (config.metaAccessToken && !config.metaAccessToken.includes('•')) {
                updateData.metaAccessToken = encrypt(config.metaAccessToken);
            }
            // Clear Twilio credentials when switching to Meta
            updateData.twilioAccountSid = null;
            updateData.twilioAuthToken = null;
            updateData.twilioWhatsappNumber = null;
        }

        await (prisma as any).integrationConfig.upsert({
            where: { organisationId: orgId },
            create: {
                organisationId: orgId,
                ...updateData
            },
            update: updateData
        });

        revalidatePath('/app/settings/integrations');
        return { success: true, message: 'Configuration WhatsApp enregistrée avec succès.' };
    } catch (error) {
        console.error('[IntegrationAction] Error saving config:', error);
        return { success: false, error: 'Erreur lors de l\'enregistrement.' };
    }
}

// ============================================
// TEST WHATSAPP CONNECTION
// ============================================

export async function testWhatsAppConnectionAction(orgId: string) {
    try {
        const config = await (prisma as any).integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config || !config.whatsappProvider) {
            return { success: false, error: 'Aucune configuration WhatsApp trouvée.' };
        }

        let testResult = { success: false, message: '' };

        if (config.whatsappProvider === 'twilio') {
            testResult = await testTwilioConnection(
                decrypt(config.twilioAccountSid),
                decrypt(config.twilioAuthToken)
            );
        } else if (config.whatsappProvider === 'meta') {
            testResult = await testMetaConnection(
                decrypt(config.metaPhoneNumberId),
                decrypt(config.metaAccessToken)
            );
        }

        // Update test status
        await (prisma as any).integrationConfig.update({
            where: { organisationId: orgId },
            data: {
                whatsappLastTestedAt: new Date(),
                whatsappTestStatus: testResult.success ? 'success' : 'failed',
                whatsappEnabled: testResult.success
            }
        });

        revalidatePath('/app/settings/integrations');
        return testResult;
    } catch (error) {
        console.error('[IntegrationAction] Test failed:', error);
        return { success: false, error: 'Erreur lors du test de connexion.' };
    }
}

// ============================================
// HELPER: Test Twilio Connection
// ============================================

async function testTwilioConnection(accountSid: string, authToken: string): Promise<{ success: boolean; message: string }> {
    try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
            }
        });

        if (response.ok) {
            const data = await response.json();
            return {
                success: true,
                message: `✅ Connexion Twilio réussie ! Compte: ${data.friendly_name}`
            };
        } else {
            const error = await response.json();
            return {
                success: false,
                message: `❌ Erreur Twilio: ${error.message || 'Identifiants invalides'}`
            };
        }
    } catch (error: any) {
        return { success: false, message: `❌ Erreur réseau: ${error.message}` };
    }
}

// ============================================
// HELPER: Test Meta Connection
// ============================================

async function testMetaConnection(phoneNumberId: string, accessToken: string): Promise<{ success: boolean; message: string }> {
    try {
        const url = `https://graph.facebook.com/v18.0/${phoneNumberId}?access_token=${accessToken}`;

        const response = await fetch(url);

        if (response.ok) {
            const data = await response.json();
            return {
                success: true,
                message: `✅ Connexion Meta réussie ! Numéro: ${data.display_phone_number || phoneNumberId}`
            };
        } else {
            const error = await response.json();
            return {
                success: false,
                message: `❌ Erreur Meta: ${error.error?.message || 'Token invalide'}`
            };
        }
    } catch (error: any) {
        return { success: false, message: `❌ Erreur réseau: ${error.message}` };
    }
}

// ============================================
// TOGGLE WHATSAPP (Enable/Disable)
// ============================================

export async function toggleWhatsAppAction(orgId: string, enabled: boolean) {
    try {
        await (prisma as any).integrationConfig.update({
            where: { organisationId: orgId },
            data: { whatsappEnabled: enabled }
        });
        revalidatePath('/app/settings/integrations');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Erreur lors de la mise à jour.' };
    }
}

// ============================================
// GET DECRYPTED CONFIG (Internal use only - Server Side)
// ============================================

export async function getDecryptedWhatsAppConfig(orgId: string) {
    try {
        const config = await (prisma as any).integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config || !config.whatsappEnabled) {
            return null;
        }

        if (config.whatsappProvider === 'twilio') {
            return {
                provider: 'twilio' as const,
                accountSid: decrypt(config.twilioAccountSid),
                authToken: decrypt(config.twilioAuthToken),
                whatsappNumber: decrypt(config.twilioWhatsappNumber)
            };
        } else if (config.whatsappProvider === 'meta') {
            return {
                provider: 'meta' as const,
                phoneNumberId: decrypt(config.metaPhoneNumberId),
                accessToken: decrypt(config.metaAccessToken)
            };
        }

        return null;
    } catch (error) {
        console.error('[IntegrationAction] Error getting decrypted config:', error);
        return null;
    }
}
