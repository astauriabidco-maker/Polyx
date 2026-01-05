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
            contract: { startDate: new Date(), status: 'DRAFT' }
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
    } else {
        provider.dpaSignedAt = undefined;
        provider.contract.status = 'SUSPENDED';
    }

    revalidatePath('/app/settings/integrations');
    return true;
}

export async function generateOnboardingLinkAction(id: string): Promise<string | null> {
    const provider = db.apiProviders.find(p => p.id === id);
    if (!provider) return null;

    const token = crypto.randomUUID();
    provider.onboardingToken = token;

    // In real app, we would return the full URL, here we return the relative path or token
    return `/onboarding/${token}`;
}

export async function consummeOnboardingTokenAction(token: string, signatureData: string): Promise<{ success: boolean; apiKey?: string }> {
    const provider = db.apiProviders.find(p => p.onboardingToken === token);

    if (!provider) {
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

    // Invalidate token so it can't be used again
    provider.onboardingToken = undefined;

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
        revalidatePath('/app/settings/integrations');
        return true;
    }
    return false;
}
