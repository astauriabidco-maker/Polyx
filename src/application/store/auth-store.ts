import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserMembership } from '@/domain/entities/user';
import { Organization } from '@/domain/entities/organization';
import { Role } from '@/domain/entities/permission';
import { ComputedPermissions } from '@/lib/permissions';
import { Agency } from '@/domain/entities/agency';

interface AuthState {
    user: User | null;
    activeOrganization: Organization | null;
    activeAgency: Agency | null;
    activeMembership: UserMembership | null;
    currentPermissions: ComputedPermissions | null;
    isLoading: boolean;

    // Actions
    login: (user: User, organization: Organization, membership: UserMembership, permissions: ComputedPermissions) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
    setActiveOrganization: (organization: Partial<Organization> & { role?: string }, permissions?: ComputedPermissions) => void;
    setActiveAgency: (agency: Agency | null) => void;
    setLoading: (loading: boolean) => void;

    // Utils
    isAuthenticated: () => boolean;
    hasPermission: (permission: keyof ComputedPermissions) => boolean;
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

            login: (user, organization, membership, permissions) => set({
                user,
                activeOrganization: organization,
                activeMembership: membership,
                currentPermissions: permissions,
                isLoading: false
            }),

            logout: () => set({
                user: null,
                activeOrganization: null,
                activeMembership: null,
                currentPermissions: null,
                isLoading: false
            }),

            updateUser: (userData) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...userData } : null
                })),

            setActiveOrganization: (organization, permissions) => set((state) => ({
                activeOrganization: { ...state.activeOrganization, ...organization } as Organization,
                // If permissions passed, use them. If not, try to keep current or null (logic depends on context)
                currentPermissions: permissions || state.currentPermissions
            })),

            setActiveAgency: (agency) => set({ activeAgency: agency }),

            setLoading: (loading) => set({ isLoading: loading }),

            isAuthenticated: () => !!get().user,

            hasPermission: (permissionKey) => {
                const perms = get().currentPermissions;
                if (!perms) return false;
                // Check if the permission key exists and is true
                // @ts-ignore
                return !!perms[permissionKey];
            }
        }),
        {
            name: 'polyx-auth-storage',
            partialize: (state) => ({
                user: state.user,
                activeOrganization: state.activeOrganization,
                activeAgency: state.activeAgency,
                activeMembership: state.activeMembership,
                currentPermissions: state.currentPermissions
            }),
        }
    )
);
