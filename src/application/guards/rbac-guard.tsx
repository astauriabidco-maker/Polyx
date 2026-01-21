'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useAuthStore } from '@/application/store/auth-store';

// Permission types matching database system_permissions
export type PermissionId =
    | 'FINANCE_VIEW' | 'FINANCE_DASHBOARD'
    | 'USER_EDIT' | 'USERS_VIEW' | 'USERS_EDIT' | 'USERS_INVITE' | 'ROLES_MANAGE'
    | 'COURSE_MANAGE' | 'TRAINING_VIEW' | 'TRAINING_EDIT' | 'TRAINING_CREATE' | 'SESSIONS_MANAGE'
    | 'LEAD_MANAGE' | 'LEADS_VIEW' | 'LEADS_EDIT' | 'LEADS_DELETE' | 'LEADS_ASSIGN' | 'LEADS_IMPORT'
    | 'LEARNERS_VIEW' | 'LEARNERS_EDIT' | 'ATTENDANCE_MANAGE' | 'CERTIFICATES_GENERATE'
    | 'BILLING_VIEW' | 'BILLING_EDIT'
    | 'SETTINGS_VIEW' | 'SETTINGS_EDIT' | 'INTEGRATIONS_MANAGE'
    | 'REPORTS_VIEW' | 'REPORTS_EXPORT'
    | 'AGENDA_VIEW' | 'AGENDA_EDIT' | 'AGENDA_ALL_USERS'
    | 'FRANCHISE_VIEW' | 'FRANCHISE_MANAGE';

interface RBACGuardProps {
    requiredPermission: PermissionId;
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * Client-side RBAC Guard using dynamic permissions from the auth store.
 * Note: This is for UI hiding only. Server Actions should use server-guard.ts for actual protection.
 */
export function RBACGuard({ requiredPermission, children, fallback }: RBACGuardProps) {
    const { user, currentPermissions, isLoading } = useAuthStore();
    const [isClient, setIsClient] = useState(false);

    // Hydration fix
    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient || isLoading) {
        return <div className="p-4 animate-pulse">Chargement des permissions...</div>;
    }

    // Check for user authentication
    if (!user) {
        return fallback ? <>{fallback}</> : <div className="p-4 text-red-500">Non connecté</div>;
    }

    // Check permissions from computed permissions (from database)
    // Map permission IDs to computed permission flags
    const hasAccess = checkPermission(requiredPermission, currentPermissions);

    if (!hasAccess) {
        return fallback ? <>{fallback}</> : (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">
                Accès refusé: Permission "{requiredPermission}" requise
            </div>
        );
    }

    return <>{children}</>;
}

/**
 * Helper to check if user has a specific permission
 * Maps database permission IDs to computed flags
 */
function checkPermission(
    permissionId: PermissionId,
    perms: { canViewFinance?: boolean; canEditUsers?: boolean; canManageCourses?: boolean; canManageLeads?: boolean } | null
): boolean {
    if (!perms) return false;

    // Map permission IDs to computed permission flags
    switch (permissionId) {
        case 'FINANCE_VIEW':
        case 'FINANCE_DASHBOARD':
        case 'BILLING_VIEW':
        case 'BILLING_EDIT':
            return !!perms.canViewFinance;

        case 'USER_EDIT':
        case 'USERS_VIEW':
        case 'USERS_EDIT':
        case 'USERS_INVITE':
        case 'ROLES_MANAGE':
            return !!perms.canEditUsers;

        case 'COURSE_MANAGE':
        case 'TRAINING_VIEW':
        case 'TRAINING_EDIT':
        case 'TRAINING_CREATE':
        case 'SESSIONS_MANAGE':
            return !!perms.canManageCourses;

        case 'LEAD_MANAGE':
        case 'LEADS_VIEW':
        case 'LEADS_EDIT':
        case 'LEADS_DELETE':
        case 'LEADS_ASSIGN':
        case 'LEADS_IMPORT':
            return !!perms.canManageLeads;

        case 'LEARNERS_VIEW':
        case 'LEARNERS_EDIT':
        case 'ATTENDANCE_MANAGE':
        case 'CERTIFICATES_GENERATE':
            return !!perms.canManageCourses; // Learners linked to courses

        case 'SETTINGS_VIEW':
        case 'SETTINGS_EDIT':
        case 'INTEGRATIONS_MANAGE':
            return !!perms.canEditUsers; // Settings require user management

        case 'REPORTS_VIEW':
        case 'REPORTS_EXPORT':
            return !!perms.canViewFinance;

        case 'AGENDA_VIEW':
        case 'AGENDA_EDIT':
        case 'AGENDA_ALL_USERS':
            return true; // Agenda accessible to all authenticated users

        case 'FRANCHISE_VIEW':
        case 'FRANCHISE_MANAGE':
            return !!perms.canEditUsers;

        default:
            return false;
    }
}

/**
 * Hook to check if user has a permission (for conditional rendering)
 */
export function useHasPermission(permissionId: PermissionId): boolean {
    const { currentPermissions } = useAuthStore();
    return checkPermission(permissionId, currentPermissions);
}

