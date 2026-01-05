'use server';

import { User } from '@/domain/entities/user';
import { Organization } from '@/domain/entities/organization';
import { Role } from '@/domain/entities/permission';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getUserOrgAccess } from '@/lib/permissions';

export interface RegisterState {
    success?: boolean;
    error?: string;
}

export async function registerOrganizationAction(formData: FormData): Promise<RegisterState> {
    // Legacy mock function - ignoring for now as focus is on Session & Permissions
    return { success: false, error: "Migration en cours vers Prisma" };
}

export async function loginAction(input: FormData | string) {
    try {
        let email = typeof input === 'string' ? input : input.get('email') as string;
        email = email?.trim().toLowerCase();

        console.log('[Login] Attempting for:', email);
        console.log('[Login] Email length:', email?.length);
        console.log('[Login] DB URL Config:', process.env.DATABASE_URL ? 'Defined' : 'Undefined');

        // 1. Find User - with detailed logging
        let user = await prisma.user.findUnique({ where: { email } });

        // Fallback: try findFirst for debugging
        if (!user) {
            console.log('[Login] findUnique failed, trying findFirst...');
            const allUsers = await prisma.user.findMany({ take: 3 });
            console.log('[Login] Available users:', allUsers.map((u: { email: string }) => u.email));
            user = allUsers.find((u: { email: string }) => u.email.toLowerCase() === email) || null;
        }

        if (!user) return { success: false, error: `Utilisateur non trouvé: "${email}"` };

        // 2. Set Cookie
        const cookieStore = await cookies();
        cookieStore.set('auth_token', 'mock_token_' + user.id, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 3600
        });

        // 3. Get Context
        const accesses = await getUserOrgAccess(user.id);

        if (accesses.length === 0) {
            console.error('[Login] No access grants.');
            return { success: false, error: "Compte sans organisation. Contactez le support." };
        }

        const access = accesses[0];
        const organization = await (prisma as any).organisation.findUnique({
            where: { id: access.organisationId },
            include: { agencies: true }
        });

        if (!organization) {
            console.error('[Login] Org not found.');
            return { success: false, error: "Organisation introuvable." };
        }

        const membership = {
            organizationId: organization.id,
            role: access.role,
            isActive: true,
            joinedAt: new Date()
        };

        // 4. Success
        return {
            success: true,
            user,
            organization,
            membership,
            permissions: access.computedPermissions
        };
    } catch (e: unknown) {
        console.error('[Login] Exception:', e);
        const message = e instanceof Error ? e.message : 'Erreur serveur inconnue.';
        return { success: false, error: `Erreur: ${message}` };
    }
}


export async function getSessionAction() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token || !token.startsWith('mock_token_')) {
        return { success: false };
    }

    const userId = token.replace('mock_token_', '');
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) return { success: false };

    // Fetch Permissions
    const accesses = await getUserOrgAccess(userId);

    if (accesses.length === 0) {
        return { success: true, user, organization: null, membership: null, permissions: null };
    }

    // Default to first access (In real app, we would store lastActiveOrgId)
    const access = accesses[0];

    const organization = await (prisma as any).organisation.findUnique({
        where: { id: access.organisationId },
        include: { agencies: true }
    });

    if (!organization) return { success: false };

    const membership = {
        organizationId: organization.id,
        role: access.role, // This is now a string name like "Administrateur"
        isActive: true,
        joinedAt: new Date()
    };

    return {
        success: true,
        user,
        organization,
        membership,
        permissions: access.computedPermissions
    };
}

export async function checkIsGlobalAdminAction() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token || !token.startsWith('mock_token_')) return false;

    const userId = token.replace('mock_token_', '');
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isGlobalAdmin: true }
    });

    return user?.isGlobalAdmin || false;
}

export async function logoutAction() {
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');
    return { success: true };
}
