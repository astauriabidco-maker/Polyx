export interface LeadInjectionPayload {
    source: string; // e.g., 'facebook', 'landing_page', 'partner_network'
    campaignId?: string;
    externalId?: string;

    contact: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        address?: string;
        zipCode?: string;
    };

    interest?: {
        trainingId?: string;
        category?: string;
        comments?: string;
    };

    consent: {
        rgpd: boolean;
        marketing: boolean;
        date: string; // ISO date
    };

    metadata?: Record<string, any>;
}

export interface EdofSyncEvent {
    action: 'REGISTRATION' | 'CANCELLATION' | 'COMPLETION' | 'UPDATE';
    dossierId: string;
    traineeId: string;
    status: string; // EDOF Status code
    timestamp: string;
    payload: Record<string, any>; // Raw EDOF payload
}
