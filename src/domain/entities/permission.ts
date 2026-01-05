// ... (keep Enum for legacy/system identification)
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN_OF = 'ADMIN_OF',
  MANAGER_AGENCY = 'MANAGER_AGENCY',
  AGENT = 'AGENT',
  TRAINER = 'TRAINER',
  LEARNER = 'LEARNER',
}

export type Permission =
  | 'manage:organization'
  | 'manage:users'
  | 'view:finance'
  | 'manage:training'
  | 'view:training'
  | 'manage:quality'
  | 'audit:view'
  | '*';

export interface RoleDefinition {
  id: string; // Can be a Role enum value (for system) or UUID
  name: string;
  isSystem: boolean;
  organizationId?: string;
  permissions: Permission[];
  description?: string;
}

export const SYSTEM_ROLES: RoleDefinition[] = [
  { id: Role.SUPER_ADMIN, name: 'Super Admin', isSystem: true, permissions: ['*'], description: 'Platform Administrator' },
  { id: Role.ADMIN_OF, name: 'Admin OF', isSystem: true, permissions: ['manage:users', 'manage:training', 'view:finance', 'manage:quality', 'audit:view'], description: 'Directeur de l\'organisme' },
  { id: Role.MANAGER_AGENCY, name: 'Manager Agence', isSystem: true, permissions: ['manage:users', 'manage:training', 'view:training'], description: 'Responsable d\'agence' },
  { id: Role.AGENT, name: 'Agent', isSystem: true, permissions: ['view:training'], description: 'Commercial / Conseiller' },
  { id: Role.TRAINER, name: 'Formateur', isSystem: true, permissions: ['view:training'], description: 'Intervenant pédagogique' },
  { id: Role.LEARNER, name: 'Apprenant', isSystem: true, permissions: ['view:training'], description: 'Stagiaire' },
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: ['*'],
  [Role.ADMIN_OF]: [
    'manage:users',
    'manage:training',
    'view:finance',
    'manage:quality',
    'audit:view',
  ],
  [Role.MANAGER_AGENCY]: ['manage:users', 'manage:training', 'view:training'],
  [Role.AGENT]: ['view:training'],
  [Role.TRAINER]: ['view:training'],
  [Role.LEARNER]: ['view:training'],
};
