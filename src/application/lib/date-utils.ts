import { Lead, LeadWithOrg } from '@/domain/entities/lead';

/**
 * Hydrates a lead object or partial lead object by converting ISO date strings
 * back into proper Date objects. This is necessary because Next.js Server Actions
 * serialize Date objects to strings when passing them from server to client.
 */
export function hydrateLead<T extends Partial<Lead>>(lead: T): T {
    const hydrated = { ...lead };

    if (hydrated.createdAt) hydrated.createdAt = new Date(hydrated.createdAt);
    if (hydrated.updatedAt) hydrated.updatedAt = new Date(hydrated.updatedAt);
    if (hydrated.responseDate) hydrated.responseDate = new Date(hydrated.responseDate);
    if (hydrated.consentDate) hydrated.consentDate = new Date(hydrated.consentDate);
    if (hydrated.lastCallDate) hydrated.lastCallDate = new Date(hydrated.lastCallDate as any);
    if (hydrated.nextCallbackAt) hydrated.nextCallbackAt = new Date(hydrated.nextCallbackAt as any);

    if (Array.isArray(hydrated.history)) {
        hydrated.history = hydrated.history.map(entry => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
        }));
    }

    return hydrated;
}

/**
 * Hydrates an array of leads.
 */
export function hydrateLeads<T extends Partial<Lead>>(leads: T[]): T[] {
    return leads.map(hydrateLead);
}
