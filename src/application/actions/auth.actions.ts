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

// ============================================
// INVITATION WORKFLOW
// ============================================

/**
 * Get invitation details by token (for accept-invitation page)
 */
export async function getInvitationAction(token: string) {
    try {
        const invitation = await (prisma as any).invitation.findUnique({
            where: { token },
            include: {
                organisation: {
                    select: { id: true, name: true, logo: true }
                },
                role: {
                    select: { id: true, name: true }
                }
            }
        });

        if (!invitation) {
            return { success: false, error: 'Invitation introuvable ou lien invalide' };
        }

        // Check expiration
        if (new Date() > new Date(invitation.expiresAt)) {
            return { success: false, error: 'Cette invitation a expiré. Contactez votre administrateur.', expired: true };
        }

        // Check if already accepted
        if (invitation.status === 'ACCEPTED') {
            return { success: false, error: 'Cette invitation a déjà été utilisée.', accepted: true };
        }

        return {
            success: true,
            invitation: {
                id: invitation.id,
                email: invitation.email,
                organisationName: invitation.organisation.name,
                organisationLogo: invitation.organisation.logo,
                roleName: invitation.role.name,
                expiresAt: invitation.expiresAt
            }
        };
    } catch (error) {
        console.error('[Invitation] Get Error:', error);
        return { success: false, error: 'Erreur lors de la vérification de l\'invitation' };
    }
}

/**
 * Accept an invitation and create user account
 */
export async function acceptInvitationAction(data: {
    token: string;
    firstName: string;
    lastName: string;
    password: string;
}) {
    try {
        // 1. Validate invitation
        const invitation = await (prisma as any).invitation.findUnique({
            where: { token: data.token },
            include: {
                organisation: true,
                role: true
            }
        });

        if (!invitation) {
            return { success: false, error: 'Invitation invalide' };
        }

        if (new Date() > new Date(invitation.expiresAt)) {
            return { success: false, error: 'Invitation expirée' };
        }

        if (invitation.status === 'ACCEPTED') {
            return { success: false, error: 'Invitation déjà utilisée' };
        }

        // 2. Transaction: Create user + access grant + update invitation
        const result = await prisma.$transaction(async (tx: any) => {
            // Check if user already exists
            let user = await tx.user.findUnique({
                where: { email: invitation.email }
            });

            if (user) {
                // User exists, just create access grant if not exists
                const existingGrant = await tx.userAccessGrant.findFirst({
                    where: {
                        userId: user.id,
                        organisationId: invitation.organisationId
                    }
                });

                if (existingGrant) {
                    return { success: false, error: 'Vous avez déjà accès à cette organisation.' };
                }
            } else {
                // Create new user
                // Note: In production, hash the password with bcrypt
                user = await tx.user.create({
                    data: {
                        email: invitation.email,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        hashedPassword: data.password, // TODO: Use bcrypt in production
                        isActive: true
                    }
                });
            }

            // Create access grant
            const accessGrant = await tx.userAccessGrant.create({
                data: {
                    userId: user.id,
                    organisationId: invitation.organisationId,
                    roleId: invitation.roleId,
                    isActive: true
                }
            });

            // Mark invitation as accepted
            await tx.invitation.update({
                where: { id: invitation.id },
                data: { status: 'ACCEPTED' }
            });

            return { user, accessGrant };
        });

        if (!result.user) {
            return result; // Error case from inside transaction
        }

        // 3. Auto-login the user
        const cookieStore = await cookies();
        cookieStore.set('auth_token', 'mock_token_' + result.user.id, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 3600 * 24 * 7 // 7 days
        });

        console.log(`[Invitation] ✅ User ${result.user.email} joined ${invitation.organisation.name}`);

        return {
            success: true,
            message: `Bienvenue chez ${invitation.organisation.name} !`,
            user: result.user,
            organisationId: invitation.organisationId,
            redirectUrl: '/app/dashboard'
        };
    } catch (error) {
        console.error('[Invitation] Accept Error:', error);
        return { success: false, error: 'Erreur lors de la création du compte' };
    }
}
