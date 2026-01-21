
import { DocumentType, FundingType } from "@/domain/entities/learner";

interface DocumentRequirement {
    type: DocumentType;
    label: string;
    required: boolean;
}

export const ComplianceEngine = {
    /**
     * Returns the list of required documents based on the funding type.
     * This needs to be called when creating a new folder or changing funding type.
     */
    getRequirements(fundingType: FundingType): DocumentRequirement[] {
        const common: DocumentRequirement[] = [
            // Tout dossier a besoin d'une trace d'entrée
        ];

        switch (fundingType) {
            case FundingType.CPF:
                // RIGUEUR MAXIMALE
                return [
                    { type: DocumentType.CONVENTION_FORMATION, label: "Convention de Formation (EDOF)", required: true },
                    { type: DocumentType.ATTESTATION_ENTREE, label: "Attestation d'entrée en stage", required: true },
                    { type: DocumentType.EMARGEMENT, label: "Relevé de connexion / Émargement", required: true },
                    { type: DocumentType.ATTESTATION_ASSIDUITE, label: "Attestation d'assiduité (Avancement)", required: true },
                    { type: DocumentType.ATTESTATION_FIN, label: "Attestation de fin de formation", required: true },
                ];

            case FundingType.PERSO:
                // SIMPLE
                return [
                    { type: DocumentType.CONTRAT_FORMATION, label: "Contrat de Formation Prof.", required: true },
                    { type: DocumentType.DEVIS_SIGNE, label: "Devis Signé / Bon de commande", required: true },
                    { type: DocumentType.FACTURE, label: "Facture Acquittée", required: true },
                ];

            case FundingType.OPCO:
                // INTERMÉDIAIRE
                return [
                    { type: DocumentType.CONVENTION_FORMATION, label: "Convention OPCO", required: true },
                    { type: DocumentType.ACCORD_PRISE_EN_CHARGE, label: "Accord de Prise en Charge", required: true },
                    { type: DocumentType.EMARGEMENT, label: "Feuilles d'émargement signées", required: true },
                    { type: DocumentType.FACTURE, label: "Facture à l'OPCO", required: true },
                ];

            case FundingType.POLE_EMPLOI:
                return [
                    { type: DocumentType.DEVIS_SIGNE, label: "Devis AIF (Kairos)", required: true },
                    { type: DocumentType.ATTESTATION_ENTREE, label: "Attestation d'Entrée (AIS)", required: true },
                    { type: DocumentType.ATTESTATION_FIN, label: "Bilan de Formation", required: true },
                ];

            default:
                return [];
        }
    },

    /**
     * Calculates the global compliance status based on documents status
     */
    calculateStatus(documents: { status: string, isRequired: boolean }[]): 'PENDING' | 'VALID' | 'ALERT' {
        const missingRequired = documents.some(d => d.isRequired && (d.status === 'MISSING' || d.status === 'REJECTED'));

        if (missingRequired) return 'ALERT';

        const allValid = documents.every(d => !d.isRequired || d.status === 'VALID');
        if (allValid) return 'VALID';

        return 'PENDING';
    }
};
