'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireGlobalAdmin } from '@/lib/server-guard';

// ============================================
// ACCESS TEMPLATE ACTIONS (User-Centric Workflow)
// ============================================

export interface AccessConfig {
    orgId: string;
    roleId: string;
    agencyIds: string[] | 'ALL';
}

export interface TemplateConfig {
    accesses: AccessConfig[];
}

/**
 * Get all access templates
 */
export async function getAccessTemplatesAction() {
    await requireGlobalAdmin();
    try {
        const templates = await (prisma as any).accessTemplate.findMany({
            orderBy: { name: 'asc' }
        });

        // Parse JSON config for each template
        return {
            success: true,
            templates: templates.map((t: any) => ({
                ...t,
                config: JSON.parse(t.config) as TemplateConfig
            }))
        };
    } catch (error) {
        console.error('[AccessTemplate] Get Templates Error:', error);
        return { success: false, error: 'Echec de la récupération des templates' };
    }
}

/**
 * Create a new access template
 */
export async function createAccessTemplateAction(data: {
    name: string;
    description?: string;
    config: TemplateConfig;
}) {
    const ctx = await requireGlobalAdmin();
    try {
        const template = await (prisma as any).accessTemplate.create({
            data: {
                name: data.name,
                description: data.description,
                config: JSON.stringify(data.config),
                createdById: ctx.userId,
                isGlobal: true
            }
        });

        revalidatePath('/super-admin/users');
        return { success: true, template };
    } catch (error) {
        console.error('[AccessTemplate] Create Error:', error);
        return { success: false, error: 'Echec de la création du template' };
    }
}

/**
 * Update an existing access template
 */
export async function updateAccessTemplateAction(id: string, data: {
    name?: string;
    description?: string;
    config?: TemplateConfig;
}) {
    await requireGlobalAdmin();
    try {
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.config) updateData.config = JSON.stringify(data.config);

        const template = await (prisma as any).accessTemplate.update({
            where: { id },
            data: updateData
        });

        revalidatePath('/super-admin/users');
        return { success: true, template };
    } catch (error) {
        console.error('[AccessTemplate] Update Error:', error);
        return { success: false, error: 'Echec de la mise à jour du template' };
    }
}

/**
 * Delete an access template
 */
export async function deleteAccessTemplateAction(id: string) {
    await requireGlobalAdmin();
    try {
        await (prisma as any).accessTemplate.delete({ where: { id } });
        revalidatePath('/super-admin/users');
        return { success: true };
    } catch (error) {
        console.error('[AccessTemplate] Delete Error:', error);
        return { success: false, error: 'Echec de la suppression du template' };
    }
}

/**
 * Apply a template to a user (creates all access grants)
 */
export async function applyTemplateToUserAction(userId: string, templateId: string) {
    await requireGlobalAdmin();
    try {
        const template = await (prisma as any).accessTemplate.findUnique({
            where: { id: templateId }
        });

        if (!template) {
            return { success: false, error: 'Template introuvable' };
        }

        const config: TemplateConfig = JSON.parse(template.config);

        await prisma.$transaction(async (tx: any) => {
            for (const access of config.accesses) {
                // Upsert UserAccessGrant
                await tx.userAccessGrant.upsert({
                    where: {
                        userId_organisationId: {
                            userId,
                            organisationId: access.orgId
                        }
                    },
                    update: { roleId: access.roleId, isActive: true },
                    create: {
                        userId,
                        organisationId: access.orgId,
                        roleId: access.roleId,
                        isActive: true
                    }
                });

                // Handle agency assignments
                if (access.agencyIds !== 'ALL') {
                    // Clear existing agencies for this org
                    const orgAgencies = await tx.agency.findMany({
                        where: { organisationId: access.orgId },
                        select: { id: true }
                    });
                    const orgAgencyIds = orgAgencies.map((a: any) => a.id);

                    await tx.userAgency.deleteMany({
                        where: {
                            userId,
                            agencyId: { in: orgAgencyIds }
                        }
                    });

                    // Assign specific agencies
                    if (access.agencyIds.length > 0) {
                        await tx.userAgency.createMany({
                            data: access.agencyIds.map(aid => ({
                                userId,
                                agencyId: aid
                            })),
                            skipDuplicates: true
                        });
                    }
                }
                // If 'ALL', we don't create UserAgency entries (means full access)
            }
        });

        revalidatePath('/super-admin/users');
        return { success: true };
    } catch (error) {
        console.error('[AccessTemplate] Apply Error:', error);
        return { success: false, error: 'Echec de l\'application du template' };
    }
}
