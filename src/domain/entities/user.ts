import { Role } from './permission';

export interface UserMembership {
    organizationId: string; // The OF
    role: Role | string;
    agencyIds?: string[]; // If restricted to specific agencies (empty = all OF)
    isActive: boolean;
    joinedAt: Date;
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;

    // Multi-Tenancy: A user can belong to multiple OFs
    memberships: UserMembership[];

    // Current context (for UI session state) - optional in DB, managed by App State
    activeOrganizationId?: string;

    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;

    // Security / Auth
    lastLogin?: Date;
    mfaEnabled?: boolean;
}
