import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserMembership } from '@/domain/entities/user';
import { Organization } from '@/domain/entities/organization';
import { Role } from '@/domain/entities/permission';
import { ComputedPermissions } from '@/lib/permissions';
import { Agency } from '@/domain/entities/agency';

// Simplified org reference for Nexus mode
export interface AccessibleOrg {
    id: string;
    name: string;
}

interface AuthState {
    user: User | null;
    activeOrganization: Organization | null;
    activeAgency: Agency | null;
    activeMembership: UserMembership | null;
    currentPermissions: ComputedPermissions | null;
    isLoading: boolean;

    // Nexus Mode (Consolidated View)
    isNexusMode: boolean;
    accessibleOrgs: AccessibleOrg[];

    // Actions
    login: (user: User, organization: Organization, membership: UserMembership, permissions: ComputedPermissions) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
    setActiveOrganization: (organization: Partial<Organization> & { role?: string }, permissions?: ComputedPermissions) => void;
    setActiveAgency: (agency: Agency | null) => void;
    setLoading: (loading: boolean) => void;
    setAccessibleOrgs: (orgs: AccessibleOrg[]) => void;
    setNexusMode: (enabled: boolean) => void;

    // Utils
    isAuthenticated: () => boolean;
    hasPermission: (permission: keyof ComputedPermissions) => boolean;
    getActiveOrgIds: () => string[];
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            activeOrganization: null,
            activeAgency: null,
            activeMembership: null,
            currentPermissions: null,
            isLoading: false,
            isNexusMode: false,
            accessibleOrgs: [],

            login: (user, organization, membership, permissions) => set({
                user,
                activeOrganization: organization,
                activeMembership: membership,
                currentPermissions: permissions,
                isLoading: false,
                isNexusMode: false // Reset Nexus mode on login
            }),

            logout: () => set({
                user: null,
                activeOrganization: null,
                activeMembership: null,
                currentPermissions: null,
                isLoading: false,
                isNexusMode: false,
                accessibleOrgs: []
            }),

            updateUser: (userData) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...userData } : null
                })),

            setActiveOrganization: (organization, permissions) => set((state) => ({
                activeOrganization: { ...state.activeOrganization, ...organization } as Organization,
                currentPermissions: permissions || state.currentPermissions,
                isNexusMode: false // Exiting Nexus mode when selecting a specific org
            })),

            setActiveAgency: (agency) => set({ activeAgency: agency }),

            setLoading: (loading) => set({ isLoading: loading }),

            setAccessibleOrgs: (orgs) => set({ accessibleOrgs: orgs }),

            setNexusMode: (enabled) => set({ isNexusMode: enabled }),

            isAuthenticated: () => !!get().user,

            hasPermission: (permissionKey) => {
                const state = get();

                // 1. Super-Admin / Global-Admin bypass
                if (state.user?.isGlobalAdmin) return true;

                const perms = state.currentPermissions;
                if (!perms) return false;

                // 2. Check if it's a legacy hardcoded boolean flag
                if (permissionKey in perms && typeof (perms as any)[permissionKey] === 'boolean') {
                    if (!!(perms as any)[permissionKey]) return true;
                }

                // 3. Check in the dynamic permissions map
                if (perms.permissions && perms.permissions[permissionKey as string]) {
                    return true;
                }

                return false;
            },

            // Returns the list of org IDs to query based on current mode
            getActiveOrgIds: () => {
                const state = get();
                if (state.isNexusMode && state.accessibleOrgs.length > 0) {
                    return state.accessibleOrgs.map(o => o.id);
                }
                return state.activeOrganization ? [state.activeOrganization.id] : [];
            }
        }),
        {
            name: 'polyx-auth-storage',
            partialize: (state) => ({
                user: state.user,
                activeOrganization: state.activeOrganization,
                activeAgency: state.activeAgency,
                activeMembership: state.activeMembership,
                currentPermissions: state.currentPermissions,
                isNexusMode: state.isNexusMode,
                accessibleOrgs: state.accessibleOrgs
            }),
        }
    )
);
