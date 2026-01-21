export interface ApiLeadRequest {
    first_name: string;
    last_name?: string;
    email: string;
    phone: string;

    zip?: string;
    city?: string;
    street?: string;

    examen_id: number;
    branch_id: number;
    source: string; // "facebook", "website", etc.

    date_consentement: string; // YYYY-MM-DD
    date_reponse: string; // YYYY-MM-DD
}

export interface BulkLeadRequest {
    leads: ApiLeadRequest[];
}

export interface BulkLeadError {
    index: number;
    error: string;
}

export interface BulkLeadResponse {
    success: boolean;
    created: number;
    created_prospection: number;
    created_crm: number;
    quarantined: number;
    total: number;
    errors: BulkLeadError[];
}
