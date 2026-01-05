'use server';

import { Agency } from '@/domain/entities/organization';
import { db } from '@/infrastructure/mock-db';

export interface AgencyState {
    success?: boolean;
    error?: string;
    agency?: Agency;
}

export async function createAgencyAction(organizationId: string, formData: FormData): Promise<AgencyState> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const name = formData.get('name') as string;
    const city = formData.get('city') as string;
    const zipCode = formData.get('zipCode') as string;
    const street = formData.get('street') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const managerName = formData.get('managerName') as string;

    if (!name || !city || !zipCode) return { error: 'Nom, Ville et Code Postal requis.' };

    const organization = db.organizations.find(o => o.id === organizationId);
    if (!organization) return { error: 'Organisation introuvable.' };

    const newAgency: Agency = {
        id: 'agency-' + crypto.randomUUID().slice(0, 8),
        organizationId,
        name,
        code: name.slice(0, 3).toUpperCase() + '-' + Math.floor(Math.random() * 100),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        address: {
            street: street || '',
            zipCode,
            city,
            country: 'France'
        },
        contacts: {
            phone: phone || '',
            email: email || ''
        },
        managerName: managerName || ''
    };

    if (!organization.agencies) organization.agencies = [];
    organization.agencies.push(newAgency);

    return { success: true, agency: newAgency };
}

export async function updateAgencyAction(organizationId: string, agencyId: string, formData: FormData): Promise<AgencyState> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const name = formData.get('name') as string;
    const city = formData.get('city') as string;
    const zipCode = formData.get('zipCode') as string;
    const street = formData.get('street') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const managerName = formData.get('managerName') as string;

    const organization = db.organizations.find(o => o.id === organizationId);
    if (!organization || !organization.agencies) return { error: 'Organisation ou Agence introuvable.' };

    const agency = organization.agencies.find(a => a.id === agencyId);
    if (!agency) return { error: 'Agence introuvable.' };

    // Update fields
    agency.name = name;
    agency.address.city = city;
    agency.address.zipCode = zipCode;
    agency.address.street = street;

    if (!agency.contacts) agency.contacts = { phone: '', email: '' };
    agency.contacts.phone = phone;
    agency.contacts.email = email;
    agency.managerName = managerName;

    agency.updatedAt = new Date();

    return { success: true, agency };
}

export async function deleteAgencyAction(organizationId: string, agencyId: string): Promise<AgencyState> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const organization = db.organizations.find(o => o.id === organizationId);
    if (!organization || !organization.agencies) return { error: 'Organisation ou Agence introuvable.' };

    const index = organization.agencies.findIndex(a => a.id === agencyId);
    if (index === -1) return { error: 'Agence introuvable.' };

    organization.agencies.splice(index, 1);

    return { success: true };
}
