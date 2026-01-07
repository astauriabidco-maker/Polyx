/**
 * Chorus Pro Service
 * Handles public sector invoicing via the French government API
 */
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

interface ChorusConfig {
    clientId: string;
    clientSecret: string;
    accountLogin: string;
    accountPassword: string;
    environment: 'sandbox' | 'production';
}

interface ChorusInvoice {
    idDestinataire: string;      // SIRET of recipient
    idFournisseur: string;       // SIRET of provider
    numeroFacture: string;       // Invoice number
    dateFacture: string;         // YYYY-MM-DD
    montantHT: number;
    montantTTC: number;
    devise: string;              // EUR
    commentaire?: string;
    pdfBase64?: string;          // PDF content
}

export class ChorusService {
    private baseUrl: string;
    private config: ChorusConfig;
    private accessToken: string | null = null;
    private tokenExpiry: Date | null = null;

    private constructor(config: ChorusConfig) {
        this.config = config;
        this.baseUrl = config.environment === 'production'
            ? 'https://chorus-pro.gouv.fr/api/v1'
            : 'https://sandbox-api.piste.gouv.fr/cpro/factures/v1';
    }

    static async create(orgId: string): Promise<ChorusService | null> {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config?.chorusEnabled || !config.chorusClientId || !config.chorusClientSecret) {
            return null;
        }

        return new ChorusService({
            clientId: config.chorusClientId,
            clientSecret: decrypt(config.chorusClientSecret),
            accountLogin: config.chorusAccountLogin || '',
            accountPassword: config.chorusAccountPassword ? decrypt(config.chorusAccountPassword) : '',
            environment: (config.chorusEnvironment as 'sandbox' | 'production') || 'sandbox'
        });
    }

    /**
     * Get OAuth access token
     */
    private async getAccessToken(): Promise<string> {
        if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
            return this.accessToken;
        }

        const tokenUrl = this.config.environment === 'production'
            ? 'https://oauth.piste.gouv.fr/api/oauth/token'
            : 'https://sandbox-oauth.piste.gouv.fr/api/oauth/token';

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                scope: 'openid'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to obtain Chorus Pro access token');
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000) - 60000); // 1 min buffer
        return this.accessToken!;
    }

    /**
     * Make authenticated API call
     */
    private async apiCall(endpoint: string, method: string = 'GET', body?: any) {
        const token = await this.getAccessToken();

        // cpro-account header (base64 encoded login:password)
        const cproAccount = Buffer.from(`${this.config.accountLogin}:${this.config.accountPassword}`).toString('base64');

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'cpro-account': cproAccount,
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || `Chorus API Error: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Test connection
     */
    async testConnection(): Promise<{ success: boolean; info?: any; error?: string }> {
        try {
            await this.getAccessToken();
            // Try to get structures
            const result = await this.apiCall('/structures/rechercher', 'POST', {
                siret: this.config.accountLogin.split(':')[0] || ''
            });
            return { success: true, info: { structures: result.listeStructures?.length || 0 } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Submit invoice
     */
    async submitInvoice(invoice: ChorusInvoice): Promise<{ success: boolean; numeroFlux?: string; error?: string }> {
        try {
            const result = await this.apiCall('/factures/soumettre', 'POST', {
                modeDepot: invoice.pdfBase64 ? 'PDF' : 'SAISIE_API',
                facture: {
                    idDestinataire: invoice.idDestinataire,
                    idFournisseur: invoice.idFournisseur,
                    numeroFactureEmetteur: invoice.numeroFacture,
                    dateFacture: invoice.dateFacture,
                    montantHT: invoice.montantHT,
                    montantTTC: invoice.montantTTC,
                    devise: invoice.devise,
                    commentaire: invoice.commentaire
                },
                piecesJointes: invoice.pdfBase64 ? [{
                    pieceJointeDesignation: `Facture_${invoice.numeroFacture}.pdf`,
                    pieceJointeType: 'application/pdf',
                    pieceJointeContenu: invoice.pdfBase64
                }] : undefined
            });

            return { success: true, numeroFlux: result.numeroFluxDepot };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get invoice status
     */
    async getInvoiceStatus(numeroFlux: string): Promise<{ success: boolean; status?: string; error?: string }> {
        try {
            const result = await this.apiCall('/factures/consulter', 'POST', {
                numeroFluxDepot: numeroFlux
            });
            return { success: true, status: result.statutFacture };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
