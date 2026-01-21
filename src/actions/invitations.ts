'use server';

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/security';

import { EmailService } from '@/application/services/email.service';

/**
 * Invite a user to an organization.
 * Generates an invitation record and sends an email via configured provider.
 */
export async function inviteUserToOrg(orgId: string, email: string, roleId: string) {
    // 1. Mock permission check
    console.log(`[AUTH] Verifying 'USER_INVITE' permission for organisation: ${orgId}`);

    // 2. Generate a secure unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    try {
        // 3. Create Invitation in Prisma
        const invitation = await prisma.invitation.create({
            data: {
                email,
                token,
                expiresAt,
                organisationId: orgId,
                roleId: roleId,
                status: 'PENDING',
            }
        });

        // 4. Send Email via Service
        const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:5555';
        const inviteLink = `${appUrl}/invite/accept?token=${token}`;

        // Fetch Org Name for email context
        const org = await prisma.organisation.findUnique({ where: { id: orgId } });

        await EmailService.send(orgId, {
            to: email,
            subject: `Invitation à rejoindre ${org?.name || 'une organisation'} sur Polyx`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Bonjour,</h2>
                    <p>Vous avez été invité à rejoindre l'organisation <strong>${org?.name}</strong> sur Polyx.</p>
                    <p>Cliquez sur le lien ci-dessous pour accepter l'invitation :</p>
                    <a href="${inviteLink}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Accepter l'invitation</a>
                    <p style="font-size: 12px; color: #666;">Ce lien expire dans 7 jours.</p>
                </div>
            `
        });

        return {
            success: true,
            invitationId: invitation.id,
            token: token
        };
    } catch (error) {
        console.error('Error in inviteUserToOrg:', error);
        return { success: false, error: 'Échec de la création de l\'invitation' };
    }
}

/**
 * Handle invitation acceptance.
 * Resolves the user account (Cas A: Existing, Cas B: Redirect to create if not found)
 * and links the new organization access.
 */
export async function acceptInvitation(token: string) {
    try {
        // 1. Find a valid invitation
        const invitation = await prisma.invitation.findUnique({
            where: { token },
            include: { organisation: true, role: true }
        });

        if (!invitation) {
            return { success: false, error: 'Invitation introuvable' };
        }

        if (invitation.status !== 'PENDING') {
            return { success: false, error: `Cette invitation a déjà été ${invitation.status.toLowerCase()}` };
        }

        if (invitation.expiresAt < new Date()) {
            return { success: false, error: 'Cette invitation a expiré' };
        }

        // 2. Resolve current user from session / cookie
        const cookieStore = await cookies();
        const authCookie = cookieStore.get('auth_token')?.value;

        if (!authCookie) {
            return {
                success: false,
                error: 'Veuillez vous connecter pour accepter cette invitation',
                needsAuth: true
            };
        }

        const payload = await verifyToken(authCookie);
        if (!payload) {
            return {
                success: false,
                error: 'Session invalide. Veuillez vous reconnecter.',
                needsAuth: true
            };
        }

        const userId = payload.userId;

        // Find User in Prisma
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        // Cas B-bis: Auth exists but user not in Prisma (Inconsistent DB state)
        if (!user) {
            return {
                success: false,
                error: 'Utilisateur introuvable dans la base SQL. Veuillez recréer votre compte.',
                needsSignup: true
            };
        }

        // 3. Cas A: User identified. Link the access grant.
        // We use upsert to avoid duplicate access grants for the same User-Org pair.
        await prisma.userAccessGrant.upsert({
            where: {
                userId_organisationId: {
                    userId: user.id,
                    organisationId: invitation.organisationId
                }
            },
            update: {
                roleId: invitation.roleId,
                isActive: true,
            },
            create: {
                userId: user.id,
                organisationId: invitation.organisationId,
                roleId: invitation.roleId,
            }
        });

        // 4. Update Invitation status
        await prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: 'ACCEPTED' }
        });

        console.log(`[INVITE] Access granted to ${user.email} for ${invitation.organisation.name}`);

        revalidatePath('/hub');

        return {
            success: true,
            orgName: invitation.organisation.name,
            orgId: invitation.organisationId
        };

    } catch (error) {
        console.error('Error in acceptInvitation:', error);
        return { success: false, error: 'Une erreur technique est survenue' };
    }
}
