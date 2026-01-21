import { RoleDefinition } from './permission';

export interface Organization {
    id: string; // UUID of the OF (Organisme de Formation)
    name: string;
    siret: string; // Keep top level for now or move to legal
    nda?: string; // Numéro de Déclaration d'Activité
    qualiopi?: boolean; // Certification status

    // Configurable Roles
    roles?: RoleDefinition[];

    // Identity Ext
    address?: {
        street: string;
        zipCode: string;
        city: string;
        country: string;
    };

    contact?: {
        phone: string;
        email: string;
        website?: string;
    };

    branding?: {
        logoUrl?: string;     // URL to logo image
        stampUrl?: string;    // URL to cachet image
        signatureUrl?: string; // URL to signature image
    };

    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;

    // An OF can have multiple agencies
    agencies?: Agency[];

    settings: {
        theme?: {
            primaryColor: string;
            // logoUrl moved to branding
        };
        modules: {
            crm: boolean;
            quality: boolean;
            billing: boolean;
            elearning: boolean;
        };
        security: {
            passwordPolicy: 'standard' | 'strict';
            sessionTimeoutMinutes: number;
        };
    };
}

export interface Agency {
    id: string;
    organizationId: string; // Parent OF
    name: string; // e.g., "Siège Paris", "Agence Lyon"
    code?: string; // Internal agency code
    siret?: string; // If different from OF

    address: {
        street: string;
        zipCode: string;
        city: string;
        country: string;
        additionalInfo?: string;
    };

    contacts?: {
        phone: string;
        email: string;
    };

    managerName?: string; // Nom du responsable d'agence

    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
