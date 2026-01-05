export enum LeadStatus {
    PROSPECT = 'PROSPECT', // Newly injected
    PROSPECTION = 'PROSPECTION', // In the loop (calling)
    ATTEMPTED = 'ATTEMPTED', // Tried to call but failed (No Answer)
    CONTACTED = 'CONTACTED', // Spoken to, decision pending
    RDV_FIXE = 'RDV_FIXE', // RDV set -> Move to CRM
    /** @deprecated Use PROSPECT + SalesStage instead */
    QUALIFIED = 'QUALIFIED', // Legacy / Shared
    DISQUALIFIED = 'DISQUALIFIED', // No interest / Wrong target
    ARCHIVED = 'ARCHIVED', // Old/GDPR cleanup
    NRP = 'NRP', // Ne Répond Pas (after X attempts)
}

export enum LeadSource {
    META = 'meta',
    FACEBOOK = 'facebook',
    LINKEDIN = 'linkedin',
    TERRAIN = 'terrain',
    TIKTOK = 'tiktok',
    STANDARD = 'standard',
    AGENCE = 'agence',
    WEBSITE = 'website',
    APPORTEUR_AFFAIRE = 'apporteur_affaire',
    API = 'api',
    AUTRE = 'autre',
    // Maintaining backwards compatibility for existing data if necessary, or just rely on manual migration if this was real
    // For now, I'll keep the old ones mapped or removed if unused. 
    // The spec is strict, so let's stick to the spec.
    GOOGLE_ADS = 'GOOGLE_ADS', // Keep for existing mock data compatibility until refactor
    REFERRAL = 'REFERRAL',
    IMPORT = 'IMPORT',
}

export enum CallOutcome {
    APPOINTMENT_SET = 'APPOINTMENT_SET',
    CALLBACK_SCHEDULED = 'CALLBACK_SCHEDULED',
    NO_ANSWER = 'NO_ANSWER',
    REFUSAL = 'REFUSAL',
    WRONG_NUMBER = 'WRONG_NUMBER',
}

export enum RefusalReason {
    PRICE = 'PRICE',
    COMPETITION = 'COMPETITION',
    NO_PROJECT = 'NO_PROJECT',
    OTHER = 'OTHER',
}

// --- CRM / CLOSING WORKFLOW ---

export enum SalesStage {
    NOUVEAU = 'NOUVEAU', // Fresh inbound < 30 days
    FRESH = 'FRESH', // Deprecated ? Keep for compat if needed, better use NOUVEAU
    RDV_FIXE = 'RDV_FIXE',
    RDV_NON_HONORE = 'RDV_NON_HONORE', // Lead didn't show up

    // Qualification Details
    DECISION_EN_ATTENTE = 'DECISION_EN_ATTENTE', // "Reporter"
    PERDU_NON_INTERESSE = 'PERDU_NON_INTERESSE', // "Abandon" (Qualif failed)

    CHOIX_FINANCEMENT = 'CHOIX_FINANCEMENT',    // Generic

    // CPF Specific
    VERIFICATION_IDENTITE = 'VERIFICATION_IDENTITE', // Identity check step
    IDENTITE_NUMERIQUE = 'IDENTITE_NUMERIQUE',
    VERIFICATION_COMPTE_CPF = 'VERIFICATION_COMPTE_CPF',
    OUVERTURE_COMPTE_CPF = 'OUVERTURE_COMPTE_CPF',
    TEST_POSITIONNEMENT = 'TEST_POSITIONNEMENT',
    EN_ATTENTE_VALIDATION_CDC = 'EN_ATTENTE_VALIDATION_CDC', // Waiting for manual validation
    INSCRIT_CPF = 'INSCRIT_CPF', // Success CPF
    COURRIERS_ENVOYES = 'COURRIERS_ENVOYES',
    COURRIERS_RECUS = 'COURRIERS_RECUS',

    // Personal Financing Specific
    OFFRE_COMMERCIALE = 'OFFRE_COMMERCIALE',
    FACTURATION = 'FACTURATION',
    PAIEMENT = 'PAIEMENT',
    INSCRIT_PERSO = 'INSCRIT_PERSO', // Success Perso (threshold met)
    DIAGNOSTIC_AGENCE = 'DIAGNOSTIC_AGENCE', // Level 0-3 Diagnostic
    GENERATION_PACK = 'GENERATION_PACK',
    SIGNATURE_CONTRAT = 'SIGNATURE_CONTRAT',
    VALIDATION_DOSSIER = 'VALIDATION_DOSSIER',

    // Shared / End
    PROBLEME_SAV = 'PROBLEME_SAV',
    PERDU_HORS_LIGNE = 'PERDU_HORS_LIGNE', // After 3 failed callbacks
    INSCRIPTION = 'INSCRIPTION', // Finalizing
    TRANSFORMATION_APPRENANT = 'TRANSFORMATION_APPRENANT' // Converted
}

export interface ClosingData {
    // Shared
    appointmentHonored?: boolean;
    fundingType?: 'CPF' | 'PERSO' | 'OPCO' | 'POLE_EMPLOI';
    problemDescription?: string;

    // CPF Specific
    cpfAccess?: 'YES' | 'NO';
    cpfIncidentType?: 'FORGOT_PASS' | 'NEVER_OPENED';
    cpfProcedureMode?: 'DIGITAL_IDENTITY' | 'MANUAL_ANGERS' | 'RECOVERY_48H';
    hasCpfAccount?: boolean;
    cpfVerificationStatus?: 'VALIDATED' | 'PENDING' | 'REJECTED';
    idCardDuration?: 'PLUS_5_ANS' | 'MOINS_5_ANS';
    digitalIdentityValidated?: boolean;
    courrierSentDate?: Date;
    courrierReceivedDate?: Date;

    // Qualiopi
    qualiopiChecklist?: {
        needsAnalysis?: boolean;
        prerequisitesValid?: boolean;
        objectivesAligned?: boolean;
    };

    // Personal Financing Specific
    testScore?: number;
    offerValidated?: boolean;
    invoiceGenerated?: boolean;
    paymentReceived?: boolean;
    paymentMethod?: 'CB' | 'VIREMENT' | 'ESPECES' | 'LIEN';
    packGenerated?: boolean;
    contractSigned?: boolean;

    // Training Integration
    trainingId?: string;
    trainingTitle?: string;
    trainingDuration?: number;
    trainingPriceHt?: number;
}

export interface LeadHistoryEntry {
    type: 'STATUS_CHANGE' | 'CALL_LOG' | 'NOTE';
    timestamp: Date;
    userId: string; // Actor
    details?: any; // e.g. { oldStatus: 'NEW', newStatus: 'PROSPECTION' } or { outcome: 'NO_ANSWER' }
}

export interface Lead {
    id: string;
    organizationId: string;

    // Contact Info
    firstName: string;
    lastName: string;
    email: string;
    phone: string;

    // Address (New)
    street?: string;
    zipCode?: string;
    city?: string;

    // Context
    source: LeadSource | string; // loose typing to allow mapped strings
    campaignId?: string;
    externalId?: string;
    providerId?: string; // Links lead to the generating partner/API key

    // Specifics (New)
    examId?: string;
    agencyId?: string;
    consentDate?: Date;
    responseDate?: Date;

    // Assignment
    assignedUserId?: string;

    // Informations Complémentaires
    jobStatus?: string; // Situation Professionnelle (SALARIE, CDI, CDD, INDEPENDANT, CHOMAGE, RETRAITE, ETUDIANT, AUTRE)

    metadata?: Record<string, any>;

    // Qualification
    score: number; // 0-100 (AI Determined)
    status: LeadStatus;

    // CRM / Closing
    salesStage?: SalesStage;
    closingData?: ClosingData;

    // Tracking / KPI
    callAttempts: number;
    lastCallDate?: Date;
    nextCallbackAt?: Date;

    // Notes & Outcomes
    notes?: string;
    refusalReason?: RefusalReason;

    history: LeadHistoryEntry[];

    createdAt: Date;
    updatedAt: Date;
}

export interface LeadWithOrg extends Lead {
    organizationName?: string;
}
