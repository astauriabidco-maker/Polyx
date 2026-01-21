/**
 * Yousign Service
 * Handles electronic signature operations using Yousign API V3
 */

import { IntegrationConfig } from '@prisma/client';
import { decrypt } from '@/lib/crypto';
import { prisma } from '@/lib/prisma';

interface YousignSigner {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string; // E.164 format (e.g., +33612345678)
}

interface YousignResult {
    success: boolean;
    procedureId?: string;
    status?: string;
    error?: string;
}

export class YousignService {
    private apiKey: string;
    private baseUrl: string;

    constructor(apiKey: string, environment: string = 'sandbox') {
        this.apiKey = apiKey;
        this.baseUrl = environment === 'production'
            ? 'https://api.yousign.com'
            : 'https://api-sandbox.yousign.app';
    }

    /**
     * Factory to create service instance from DB config
     */
    static async create(orgId: string): Promise<YousignService | null> {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config || !config.yousignApiKey || !config.yousignEnabled) {
            return null;
        }

        const apiKey = decrypt(config.yousignApiKey);
        return new YousignService(apiKey, config.yousignEnvironment || 'sandbox');
    }

    /**
     * Test connection to Yousign API
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/v3/users/me`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Connection failed');
            }

            const data = await response.json();
            return {
                success: true,
                message: `Connecté en tant que ${data.firstName} ${data.lastName} (${this.baseUrl.includes('sandbox') ? 'SANDBOX' : 'PRODUCTION'})`
            };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Initiate a Signature Request
     * Note: This is a simplified flow. V3 requires:
     * 1. Create Signature Request
     * 2. Upload Document
     * 3. Add Signer
     * 4. Activate Signature Request
     */
    async initiateSignatureRequest(
        documentName: string,
        documentBuffer: Buffer,
        signers: YousignSigner[]
    ): Promise<YousignResult> {
        try {
            // 1. Create Signature Request
            const reqResponse = await fetch(`${this.baseUrl}/v3/signature_requests`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: documentName,
                    delivery_mode: 'email',
                    timezone: 'Europe/Paris'
                })
            });

            if (!reqResponse.ok) throw new Error('Failed to create signature request');
            const signatureRequest = await reqResponse.json();
            const signatureRequestId = signatureRequest.id;

            // 2. Upload Document
            const formData = new FormData();
            const blob = new Blob([new Uint8Array(documentBuffer)], { type: 'application/pdf' });
            formData.append('file', blob, documentName);
            formData.append('nature', 'signable_document');
            formData.append('parse_anchors', 'true');

            const docResponse = await fetch(`${this.baseUrl}/v3/signature_requests/${signatureRequestId}/documents`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: formData
            });

            if (!docResponse.ok) throw new Error('Failed to upload document');
            const document = await docResponse.json();
            const documentId = document.id;

            // 3. Add Signers
            for (const signer of signers) {
                const signerData = {
                    info: {
                        first_name: signer.firstName,
                        last_name: signer.lastName,
                        email: signer.email,
                        phone_number: signer.phoneNumber || '+33600000000', // Required for authentication
                        locale: 'fr'
                    },
                    fields: [
                        {
                            document_id: documentId,
                            type: 'signature',
                            page: 1, // Default to page 1 if no anchors
                            x: 100,
                            y: 100
                        }
                    ],
                    signature_level: 'electronic_signature',
                    signature_authentication_mode: 'no_otp' // Use OTP in meaningful envs
                };

                const signerRes = await fetch(`${this.baseUrl}/v3/signature_requests/${signatureRequestId}/signers`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(signerData)
                });

                if (!signerRes.ok) {
                    const err = await signerRes.json();
                    throw new Error(`Failed to add signer ${signer.email}: ${JSON.stringify(err)}`);
                }
            }

            // 4. Activate Signature Request
            const activateRes = await fetch(`${this.baseUrl}/v3/signature_requests/${signatureRequestId}/activate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!activateRes.ok) throw new Error('Failed to activate signature request');

            return {
                success: true,
                procedureId: signatureRequestId,
                status: 'active'
            };

        } catch (error: any) {
            console.error('[Yousign] Error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get status of a signature request
     */
    async getSignatureStatus(signatureRequestId: string): Promise<string> {
        const response = await fetch(`${this.baseUrl}/v3/signature_requests/${signatureRequestId}`, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`
            }
        });

        if (!response.ok) throw new Error('Failed to get status');
        const data = await response.json();
        return data.status; // 'draft', 'active', 'finished', 'expired', ...
    }
}
