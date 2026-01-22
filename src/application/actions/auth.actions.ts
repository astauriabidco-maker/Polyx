'use server';

import { User } from '@/domain/entities/user';
import { Organization } from '@/domain/entities/organization';
import { Role } from '@/domain/entities/permission';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getUserOrgAccess } from '@/lib/permissions';
import { verifyPassword, createToken, isBcryptHash } from '@/lib/security';

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
        // 1. Extract credentials
        let email: string;
        let password: string;

        if (typeof input === 'string') {
            email = input;
            password = '';
        } else {
            email = input.get('email') as string;
            password = input.get('password') as string || '';
        }

        email = email?.trim().toLowerCase();

        if (!email) {
            return { success: false, error: 'Email requis' };
        }

        // 2. Find User
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return { success: false, error: 'Email ou mot de passe incorrect' };
        }

        if (!user.isActive) {
            return { success: false, error: 'Compte désactivé. Contactez le support.' };
        }

        // 3. Verify Password
        // Only verify if password is hashed (bcrypt format)
        if (user.hashedPassword && await isBcryptHash(user.hashedPassword)) {
            const isValidPassword = await verifyPassword(password, user.hashedPassword);
            if (!isValidPassword) {
                return { success: false, error: 'Email ou mot de passe incorrect' };
            }
        }
        // If no hashed password, allow login (for migration period - TODO: remove after migration)

        // 4. Create JWT Token
        const token = await createToken({
            userId: user.id,
            email: user.email,
            isGlobalAdmin: user.isGlobalAdmin
        });

        // 5. Set Secure Cookie
        const cookieStore = await cookies();
        cookieStore.set('auth_token', token, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        // 6. Get Context
        const accesses = await getUserOrgAccess(user.id);

        if (accesses.length === 0) {
            console.error('[Login] No access grants for user:', user.email);
            return { success: false, error: "Compte sans organisation. Contactez le support." };
        }

        const access = accesses[0];
        const organization = await (prisma as any).organisation.findUnique({
            where: { id: access.organisationId },
            include: { agencies: true }
        });

        if (!organization) {
            console.error('[Login] Org not found for access:', access.organisationId);
            return { success: false, error: "Organisation introuvable." };
        }

        const membership = {
            organizationId: organization.id,
            role: access.role,
            isActive: true,
            joinedAt: new Date()
        };

        // 7. Success
        console.log('[Login] ✅ Success for:', user.email);
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


export async function switchOrganizationAction(orgId: string) {
    try {
        const cookieStore = await cookies();
        cookieStore.set('active_org_id', orgId, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        // Resolve new context for the client
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return { success: false, error: 'Session expirée' };

        const { verifyToken } = await import('@/lib/security');
        const payload = await verifyToken(token);
        if (!payload) return { success: false, error: 'Token invalide' };

        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user) return { success: false, error: 'Utilisateur introuvable' };

        const accesses = await getUserOrgAccess(user.id);
        const access = accesses.find(a => a.organisationId === orgId);

        if (!access) return { success: false, error: 'Accès refusé à cet OF' };

        const organization = await (prisma as any).organisation.findUnique({
            where: { id: orgId },
            include: { agencies: true }
        });

        const membership = {
            organizationId: orgId,
            role: access.role,
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
    } catch (error) {
        console.error('[AuthAction] Switch Org Error:', error);
        return { success: false, error: 'Erreur lors du changement d\'organisation' };
    }
}

export async function getSessionAction() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const activeOrgId = cookieStore.get('active_org_id')?.value;

    if (!token) {
        return { success: false };
    }

    // Verify JWT token
    const { verifyToken } = await import('@/lib/security');
    const payload = await verifyToken(token);

    if (!payload) {
        return { success: false };
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.userId }
    });

    if (!user) return { success: false };
    if (!user.isActive) return { success: false };

    // Fetch Permissions
    const accesses = await getUserOrgAccess(payload.userId);

    if (accesses.length === 0) {
        return { success: true, user, organization: null, membership: null, permissions: null, accessibleOrgs: [] };
    }

    // Build list of all accessible orgs for Nexus mode
    const accessibleOrgs = accesses.map(a => ({
        id: a.organisationId,
        name: a.organisationName
    }));

    // Selection logic: use cookie if valid, otherwise fallback to first access
    let access = accesses[0];
    if (activeOrgId) {
        const preferredAccess = accesses.find(a => a.organisationId === activeOrgId);
        if (preferredAccess) {
            access = preferredAccess;
        }
    }

    const organization = await (prisma as any).organisation.findUnique({
        where: { id: access.organisationId },
        include: { agencies: true }
    });

    if (!organization) return { success: false };

    const membership = {
        organizationId: organization.id,
        role: access.role,
        isActive: true,
        joinedAt: new Date()
    };

    return {
        success: true,
        user,
        organization,
        membership,
        permissions: access.computedPermissions,
        accessibleOrgs
    };
}

export async function checkIsGlobalAdminAction() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return false;

    // Verify JWT and use payload directly for quick check
    const { verifyToken } = await import('@/lib/security');
    const payload = await verifyToken(token);

    if (!payload) return false;

    // Use cached value from token for performance, or verify from DB
    if (payload.isGlobalAdmin) return true;

    // Fallback: verify from database
    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
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
        // Import security utilities
        const { hashPassword, createToken } = await import('@/lib/security');

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

        // 2. Validate password
        if (!data.password || data.password.length < 8) {
            return { success: false, error: 'Le mot de passe doit contenir au moins 8 caractères' };
        }

        // 3. Hash the password
        const hashedPassword = await hashPassword(data.password);

        // 4. Transaction: Create user + access grant + update invitation
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
                // Create new user with hashed password
                user = await tx.user.create({
                    data: {
                        email: invitation.email,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        hashedPassword: hashedPassword,
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

        // 5. Create JWT token for auto-login
        const jwtToken = await createToken({
            userId: result.user.id,
            email: result.user.email,
            isGlobalAdmin: result.user.isGlobalAdmin || false
        });

        // 6. Set secure cookie
        const cookieStore = await cookies();
        cookieStore.set('auth_token', jwtToken, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
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
