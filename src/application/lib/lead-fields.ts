import { FieldDefinition } from '@/domain/entities/filter';
import { LeadStatus, LeadSource } from '@/domain/entities/lead';

export const LEAD_FIELDS: FieldDefinition[] = [
    { id: 'firstName', label: 'Prénom', type: 'text' },
    { id: 'lastName', label: 'Nom', type: 'text' },
    { id: 'email', label: 'Email', type: 'text' },
    { id: 'phone', label: 'Téléphone', type: 'text' },
    {
        id: 'status',
        label: 'Statut',
        type: 'enum',
        options: Object.values(LeadStatus).map(s => ({ label: s, value: s }))
    },
    {
        id: 'source',
        label: 'Source',
        type: 'enum',
        options: Object.values(LeadSource).map(s => ({ label: s, value: s }))
    },
    { id: 'score', label: 'Score IA', type: 'number' },
    { id: 'city', label: 'Ville', type: 'text' },
    { id: 'zipCode', label: 'Code Postal', type: 'text' },
    { id: 'callAttempts', label: 'Tentatives d\'appel', type: 'number' },
    {
        id: 'jobStatus',
        label: 'Statut Professionnel',
        type: 'enum',
        options: [
            { label: 'Salarié CDI', value: 'CDI' },
            { label: 'Salarié CDD', value: 'CDD' },
            { label: 'Indépendant', value: 'FREELANCE' },
            { label: 'Demandeur d\'emploi', value: 'CHOMAGE' },
            { label: 'Autre', value: 'AUTRE' }
        ]
    },
    {
        id: 'hasTraining',
        label: 'Déjà en formation ?',
        type: 'enum',
        options: [
            { label: 'Oui', value: 'true' },
            { label: 'Non', value: 'false' }
        ]
    },
    { id: 'lastTrainingDate', label: 'Date fin dernière formation', type: 'date' },
];
