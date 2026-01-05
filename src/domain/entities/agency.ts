export interface Agency {
    id: string;
    organisationId: string;
    name: string;
    code?: string;
    email?: string;
    phone?: string;
    street?: string;
    zipCode?: string;
    city?: string;
    country?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserAgency {
    userId: string;
    agencyId: string;
}
