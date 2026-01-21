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
    distributionMode?: 'ROUND_ROBIN' | 'LOAD_BALANCED' | 'SKILL_BASED';
    distributionConfig?: any;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserAgency {
    userId: string;
    agencyId: string;
}
