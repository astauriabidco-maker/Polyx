'use server';

import { db, ApiProvider } from '@/infrastructure/mock-db';
import { revalidatePath } from 'next/cache';

export async function getProvidersAction(): Promise<ApiProvider[]> {
    return db.apiProviders.filter(p => p.isActive);
}

export async function createProviderAction(name: string): Promise<{ success: boolean; provider?: ApiProvider; apiKey?: string }> {
    try {
        const apiKey = `polyx_live_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;

        const newProvider: ApiProvider = {
            id: `prov-${crypto.randomUUID().substring(0, 8)}`,
            name,
            apiKey: apiKey,
            isActive: true,
            allowedBranches: ['demo-org', 'sec-org-id'], // Default to all for now
            createdAt: new Date(),
            complianceStatus: 'PENDING', // Default to locked until DPA signed
            legalName: '',
            siret: '',
            providerType: 'LEAD_GENERATOR',
            contact: { name: '', email: '', phone: '', role: '' },
            contract: { startDate: new Date(), status: 'DRAFT' },
            auditLogs: [
                { timestamp: new Date(), event: 'CREATED', description: `Partenaire INITIALISÉ: ${name}` }
            ]
        };

        db.apiProviders.push(newProvider);
        revalidatePath('/app/settings/integrations');
        return { success: true, provider: newProvider, apiKey };
    } catch (error) {
        return { success: false };
    }
}

export async function verifyProviderComplianceAction(id: string, isVerified: boolean): Promise<boolean> {
    const provider = db.apiProviders.find(p => p.id === id);
    if (!provider) return false;

    provider.complianceStatus = isVerified ? 'VERIFIED' : 'PENDING';
    if (isVerified) {
        provider.dpaSignedAt = new Date();
        provider.contract.status = 'ACTIVE';
        provider.auditLogs.push({
            timestamp: new Date(),
            event: 'COMPLIANCE_VERIFIED',
            description: 'Conformité validée manuellement par l\'administrateur.'
        });
    } else {
        provider.dpaSignedAt = undefined;
        provider.contract.status = 'SUSPENDED';
        provider.auditLogs.push({
            timestamp: new Date(),
            event: 'COMPLIANCE_REVOKED',
            description: 'Conformité révoquée manuellement.'
        });
    }

    revalidatePath('/app/settings/integrations');
    return true;
}

export async function generateOnboardingLinkAction(id: string): Promise<string | null> {
    const provider = db.apiProviders.find(p => p.id === id);
    if (!provider) return null;

    const token = crypto.randomUUID();
    provider.onboardingToken = token;

    // Set Expiration (72h)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);
    provider.onboardingExpiresAt = expiresAt;

    provider.auditLogs.push({
        timestamp: new Date(),
        event: 'LINK_GENERATED',
        description: `Lien d'onboarding généré (Expire le ${expiresAt.toLocaleString()})`
    });

    // In real app, we would return the full URL, here we return the relative path or token
    return `/onboarding/${token}`;
}

export async function consummeOnboardingTokenAction(token: string, signatureData: string): Promise<{ success: boolean; apiKey?: string }> {
    const provider = db.apiProviders.find(p => p.onboardingToken === token);

    if (!provider) {
        return { success: false };
    }

    // Check Expiration
    if (provider.onboardingExpiresAt && new Date() > provider.onboardingExpiresAt) {
        provider.auditLogs.push({
            timestamp: new Date(),
            event: 'ONBOARDING_FAILED',
            description: 'Tentative d\'onboarding avec un lien expiré.'
        });
        return { success: false };
    }

    // Verify compliance
    const activeDpa = db.legalDocuments.find(d => d.type === 'DPA' && d.isActive);
    const dpaVersion = activeDpa ? activeDpa.version : 'v1';

    provider.complianceStatus = 'VERIFIED';
    provider.dpaSignedAt = new Date();
    provider.dpaVersion = dpaVersion;
    provider.contract.status = 'ACTIVE';
    provider.signatureUrl = signatureData;

    provider.auditLogs.push({
        timestamp: new Date(),
        event: 'ONBOARDING_COMPLETED',
        description: `Onboarding réussi par le partenaire. DPA ${dpaVersion} signé.`
    });

    // SIMULATE NOTIFICATION
    console.log(`[NOTIFICATION ADMIN] Le partenaire ${provider.name} a finalisé son onboarding. Clé API activée.`);

    // Invalidate token so it can't be used again
    provider.onboardingToken = undefined;
    provider.onboardingExpiresAt = undefined;

    revalidatePath('/app/settings/integrations');
    return { success: true, apiKey: provider.apiKey };
}

export async function updateProviderAction(id: string, data: Partial<ApiProvider>): Promise<boolean> {
    const provider = db.apiProviders.find(p => p.id === id);
    if (!provider) return false;

    // Merge updates safely
    if (data.name) provider.name = data.name;
    if (data.legalName) provider.legalName = data.legalName;
    if (data.siret) provider.siret = data.siret;
    if (data.providerType) provider.providerType = data.providerType;
    if (data.contact) provider.contact = { ...provider.contact, ...data.contact } as any;

    // Ensure contract structure exists if updating it
    if (data.contract) {
        provider.contract = { ...provider.contract, ...data.contract } as any;
    }

    revalidatePath('/app/settings/integrations');
    return true;
}

export async function revokeProviderAction(id: string): Promise<boolean> {
    const provider = db.apiProviders.find(p => p.id === id);
    if (provider) {
        provider.isActive = false;
        provider.auditLogs.push({
            timestamp: new Date(),
            event: 'REVOKED',
            description: 'Accès API révoqué par l\'administrateur.'
        });
        revalidatePath('/app/settings/integrations');
        return true;
    }
    return false;
}
