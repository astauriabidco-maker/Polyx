'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth, requireGlobalAdmin, requirePermission } from '@/lib/server-guard';

// ============================================
// ORGANIZATION PROFILE (Prisma-backed) - Protected by Server Guards
// ============================================

export async function getOrganizationAction(organisationId: string) {
    try {
        // Guard: Require authentication
        await requireAuth();

        const org = await (prisma as any).organisation.findUnique({
            where: { id: organisationId },
            include: {
                integrationConfig: {
                    select: {
                        whatsappEnabled: true,
                        smsEnabled: true,
                        voiceEnabled: true,
                        emailEnabled: true
                    }
                },
                _count: {
                    select: {
                        accessGrants: true,
                        agencies: true,
                        leads: true,
                        learners: true,
                        trainings: true
                    }
                }
            }
        });

        if (!org) return { success: false, error: 'Organisation introuvable' };

        return {
            success: true,
            organization: {
                id: org.id,
                name: org.name,
                siret: org.siret,
                logo: org.logo,
                nda: org.nda,
                qualiopi: org.qualiopi,
                isActive: org.isActive,
                street: org.street,
                zipCode: org.zipCode,
                city: org.city,
                country: org.country,
                phone: org.phone,
                email: org.email,
                website: org.website,
                turnover: org.turnover,
                integrations: org.integrationConfig,
                stats: org._count
            }
        };
    } catch (error) {
        console.error('[OrgAction] Get Organization Error:', error);
        return { success: false, error: 'Failed to fetch organization' };
    }
}

export async function updateOrganizationAction(organisationId: string, data: {
    name?: string;
    siret?: string;
    logo?: string;
    nda?: string;
    qualiopi?: boolean;
    street?: string;
    zipCode?: string;
    city?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
}) {
    try {
        // Guard: Require SETTINGS_EDIT permission
        await requirePermission('SETTINGS_EDIT');

        const org = await (prisma as any).organisation.update({
            where: { id: organisationId },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });

        revalidatePath('/app/settings/organization');
        return { success: true, organization: org };
    } catch (error) {
        console.error('[OrgAction] Update Organization Error:', error);
        return { success: false, error: 'Failed to update organization' };
    }
}

// ============================================
// SUPER ADMIN: CREATE ORGANIZATION
// ============================================

export async function createOrganizationAction(data: {
    name: string;
    siret?: string;
    nda?: string;
    email?: string;
    phone?: string;
    street?: string;
    city?: string;
    zipCode?: string;
}) {
    try {
        // Guard: Only Global Admins can create organizations
        await requireGlobalAdmin();

        // Check SIRET uniqueness if provided
        if (data.siret) {
            const existing = await (prisma as any).organisation.findUnique({
                where: { siret: data.siret }
            });
            if (existing) return { success: false, error: 'Ce numéro SIRET est déjà utilisé' };
        }

        const org = await (prisma as any).organisation.create({
            data: {
                name: data.name,
                siret: data.siret,
                nda: data.nda,
                email: data.email,
                phone: data.phone,
                street: data.street,
                city: data.city,
                zipCode: data.zipCode,
                country: 'France',
                isActive: true,
                qualiopi: false
            }
        });

        // Create default Admin role for this org
        await (prisma as any).role.create({
            data: {
                name: 'Administrateur',
                organisationId: org.id,
                isSystemDefault: true
            }
        });

        revalidatePath('/super-admin/organizations');
        return { success: true, organization: org };
    } catch (error) {
        console.error('[OrgAction] Create Organization Error:', error);
        return { success: false, error: 'Failed to create organization' };
    }
}

// ============================================
// LIST ORGANIZATIONS (Super Admin)
// ============================================

export async function getOrganizationsAction() {
    try {
        // Guard: Only Global Admins can list all organizations
        await requireGlobalAdmin();

        const orgs = await (prisma as any).organisation.findMany({
            include: {
                _count: {
                    select: {
                        accessGrants: true,
                        agencies: true,
                        leads: true,
                        learners: true
                    }
                }
            },
            orderBy: [
                { status: 'asc' },
                { name: 'asc' }
            ]
        });

        return { success: true, organizations: orgs };
    } catch (error) {
        console.error('[OrgAction] Get Organizations Error:', error);
        return { success: false, error: 'Failed to fetch organizations' };
    }
}

// ============================================
// Actions activate, reject, suspend organisation moved to src/actions/super-admin.ts for centralization.

/**
 * Resend admin invitation for an organization
 */
export async function resendAdminInvitationAction(organisationId: string) {
    try {
        // Guard: Only Global Admins can resend invitations
        await requireGlobalAdmin();

        const org = await (prisma as any).organisation.findUnique({
            where: { id: organisationId }
        });

        if (!org) return { success: false, error: 'Organisation introuvable' };
        if (!org.primaryContactEmail) return { success: false, error: 'Aucun email de contact principal' };

        // Find admin role
        const adminRole = await (prisma as any).role.findFirst({
            where: { organisationId, isSystemDefault: true }
        });

        if (!adminRole) return { success: false, error: 'Rôle admin non trouvé' };

        // Invalidate existing invitations
        await (prisma as any).invitation.updateMany({
            where: { organisationId, email: org.primaryContactEmail, status: 'PENDING' },
            data: { status: 'EXPIRED' }
        });

        // Create new invitation
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invitation = await (prisma as any).invitation.create({
            data: {
                email: org.primaryContactEmail,
                token,
                expiresAt,
                status: 'PENDING',
                organisationId,
                roleId: adminRole.id
            }
        });

        // TODO: Send email
        console.log(`[OrgAction] 📧 New invitation sent to ${org.primaryContactEmail}`);

        return { success: true, invitation };
    } catch (error) {
        console.error('[OrgAction] Resend Invitation Error:', error);
        return { success: false, error: 'Failed to resend invitation' };
    }
}

// ============================================
// ORGANISATION GROUPS (Multi-OF Networks)
// ============================================

// ============================================

export async function getOrganisationGroupsAction() {
    await requireGlobalAdmin();
    try {
        const groups = await (prisma as any).organisationGroup.findMany({
            include: {
                members: {
                    include: {
                        organisation: {
                            select: { id: true, name: true, logo: true, status: true }
                        }
                    }
                },
                _count: { select: { members: true } }
            },
            orderBy: { name: 'asc' }
        });

        return { success: true, groups };
    } catch (error) {
        console.error('[OrgAction] Get Groups Error:', error);
        return { success: false, error: 'Failed to fetch organisation groups' };
    }
}

export async function createOrganisationGroupAction(data: {
    name: string;
    description?: string;
    createdById: string;
    organisationIds?: string[];
}) {
    await requireGlobalAdmin();
    try {
        const group = await (prisma as any).organisationGroup.create({
            data: {
                name: data.name,
                description: data.description,
                createdById: data.createdById,
                members: data.organisationIds ? {
                    create: data.organisationIds.map((orgId, index) => ({
                        organisationId: orgId,
                        role: index === 0 ? 'OWNER' : 'MEMBER'
                    }))
                } : undefined
            },
            include: { members: true }
        });

        revalidatePath('/super-admin/groups');
        return { success: true, group };
    } catch (error) {
        console.error('[OrgAction] Create Group Error:', error);
        return { success: false, error: 'Failed to create organisation group' };
    }
}

export async function addOrganisationToGroupAction(groupId: string, organisationId: string, role: string = 'MEMBER') {
    // Guard: Only Global Admins can manage groups
    await requireGlobalAdmin();
    try {
        const member = await (prisma as any).organisationGroupMember.create({
            data: { groupId, organisationId, role }
        });

        revalidatePath('/super-admin/groups');
        return { success: true, member };
    } catch (error) {
        console.error('[OrgAction] Add to Group Error:', error);
        return { success: false, error: 'Failed to add organisation to group' };
    }
}

export async function removeOrganisationFromGroupAction(groupId: string, organisationId: string) {
    // Guard: Only Global Admins can manage groups
    await requireGlobalAdmin();
    try {
        await (prisma as any).organisationGroupMember.delete({
            where: { groupId_organisationId: { groupId, organisationId } }
        });

        revalidatePath('/super-admin/groups');
        return { success: true };
    } catch (error) {
        console.error('[OrgAction] Remove from Group Error:', error);
        return { success: false, error: 'Failed to remove organisation from group' };
    }
}

