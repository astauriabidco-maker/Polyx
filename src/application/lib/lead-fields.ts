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
];
