
export enum FundingType {
    CPF = 'CPF',
    PERSO = 'PERSO',
    OPCO = 'OPCO',
    POLE_EMPLOI = 'POLE_EMPLOI'
}

export enum LearnerStatus {
    ONBOARDING = 'ONBOARDING',
    IN_TRAINING = 'IN_TRAINING',
    COMPLETED = 'COMPLETED',
    DROPPED = 'DROPPED'
}

export enum ComplianceStatus {
    PENDING = 'PENDING',
    VALID = 'VALID',
    ALERT = 'ALERT',
    REJECTED = 'REJECTED'
}

export enum DocumentType {
    // Administratif
    CONVENTION_FORMATION = 'CONVENTION_FORMATION',
    CONTRAT_FORMATION = 'CONTRAT_FORMATION',
    DEVIS_SIGNE = 'DEVIS_SIGNE',

    // Suivi
    EMARGEMENT = 'EMARGEMENT',
    ATTESTATION_ENTREE = 'ATTESTATION_ENTREE',
    ATTESTATION_ASSIDUITE = 'ATTESTATION_ASSIDUITE',
    ATTESTATION_FIN = 'ATTESTATION_FIN',

    // Financier
    PREUVE_VIREMENT = 'PREUVE_VIREMENT',
    FACTURE = 'FACTURE',
    ACCORD_PRISE_EN_CHARGE = 'ACCORD_PRISE_EN_CHARGE'
}

export interface Learner {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    // Address
    address?: string | null;
    postalCode?: string | null;
    city?: string | null;
    createdAt: Date;
    folders?: LearnerFolder[];
}

export interface LearnerFolder {
    id: string;
    learnerId: string;
    fundingType: FundingType;
    status: LearnerStatus;
    complianceStatus: ComplianceStatus;
    documents?: LearnerDocument[];
    officialStartDate?: Date | null;
    officialEndDate?: Date | null;
    actualStartDate?: Date | null;
    actualEndDate?: Date | null;

    // CPF / External Data
    externalFileId?: string | null;
    funderName?: string | null;
    cpfStatus?: string | null; // "Accepté", "En attente", "Refusé"
    cpfProgressStatus?: string | null; // CDC Progress (A_TRAITER, EN_ATTENTE, ACCEPTE, etc.)

    // CDC Milestone Dates
    receivedDate?: Date | null;
    acceptanceDate?: Date | null;
    entryDeclaredDate?: Date | null;
    exitDeclaredDate?: Date | null;
    serviceDeclaredDate?: Date | null;
    serviceValidatedDate?: Date | null;
    invoicedDate?: Date | null;

    // Financials
    trainingAmount?: number | null;

    // Pedagogy
    trainingTitle?: string | null;
    trainingLocation?: string | null;
    trainingPostalCode?: string | null;
    trainingDuration?: number | null;
    remainingHours?: number | null;
    weeklyIntensity?: string | null;

    // Formateur
    formateurId?: string | null;
    formateurNda?: string | null;
    formateurCvUrl?: string | null;

    // Advanced Status Flags (New UI)
    examDate?: Date | null;
    isBlocked?: boolean;
    blockReason?: string;
    isLowLevel?: boolean;
    isDropoutRisk?: boolean;
}

export interface LearnerDocument {
    id: string;
    type: DocumentType;
    label: string;
    status: 'MISSING' | 'PENDING_REVIEW' | 'VALID' | 'REJECTED';
    isRequired: boolean;
    fileUrl?: string | null;
}
