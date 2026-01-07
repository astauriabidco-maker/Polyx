'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ============================================
// LEARNER PORTAL ACTIONS
// ============================================

export async function getLearnerSelfAction(userId: string) {
    try {
        // Find Learner linked to this User
        // Note: A User might be a staff member AND a learner, or just a learner.
        // We look for a Learner record where userId matches.
        const learner = await prisma.learner.findFirst({
            where: { userId },
            include: {
                organisation: true,
                folders: {
                    include: {
                        training: true,
                        documents: true
                    },
                    where: { status: { not: 'ARCHIVED' } } // Exclude archived
                },
                agency: true
            }
        });

        if (!learner) {
            return { success: false, error: 'Profil apprenant non trouvé.' };
        }

        return { success: true, data: learner };
    } catch (error) {
        console.error('[LearnerAction] Error fetching self:', error);
        return { success: false, error: 'Erreur lors de la récupération du profil.' };
    }
}

export async function getLearnerPlanningAction(learnerId: string) {
    try {
        // Get training sessions where the learner is registered via LearnerFolder -> Training
        // OR better: if we have a direct link to attendance/sessions.
        // Ideally, we should check sessions linked to the Learner's Folder.

        // Strategy: Get all folders, then find sessions for the training in that folder.
        // AND check if the learner is specifically assigned to a session (if we have that granularity).
        // For now, let's fetch sessions for the training associated with the learner's active folders.

        const learner = await prisma.learner.findUnique({
            where: { id: learnerId },
            include: {
                folders: {
                    include: { training: true }
                }
            }
        });

        if (!learner) {
            return { success: false, error: 'Apprenant introuvable.' };
        }

        const trainingIds = learner.folders
            .map(f => f.trainingId)
            .filter((id): id is string => !!id);

        if (trainingIds.length === 0) {
            return { success: true, data: [] };
        }

        // Fetch sessions for these trainings
        // In a real scenario, we might want to filter by sessions specifically assigned to this learner group or agency.
        const sessions = await (prisma as any).trainingSession.findMany({
            where: {
                trainingId: { in: trainingIds },
                date: { gte: new Date() }, // Future sessions primarily
                // Filter by Agency if learner has one?
                ...(learner.agencyId ? { agencyId: learner.agencyId } : {})
            },
            include: {
                training: true,
                formateur: true
            },
            orderBy: { date: 'asc' },
            take: 10
        });

        return { success: true, data: sessions };

    } catch (error) {
        console.error('[LearnerAction] Error fetching planning:', error);
        return { success: false, error: 'Erreur lors de la récupération du planning.' };
    }
}

export async function getLearnerDocumentsAction(learnerId: string) {
    try {
        // Documents are usually stored in LearnerFolder -> LearnerDocument
        const documents = await prisma.learnerDocument.findMany({
            where: {
                folder: {
                    learnerId: learnerId
                }
            },
            orderBy: { createdAt: 'desc' },
            include: {
                folder: {
                    select: { training: { select: { title: true } } }
                }
            }
        });

        return { success: true, data: documents };
    } catch (error) {
        console.error('[LearnerAction] Error fetching documents:', error);
        return { success: false, error: 'Erreur lors de la récupération des documents.' };
    }
}

// ============================================
// LEARNER ADMIN ACTIONS
// ============================================

export async function getLearnersAction(orgId: string) {
    try {
        const learners = await prisma.learner.findMany({
            where: { organisationId: orgId },
            include: {
                folders: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { lastName: 'asc' }
        });
        return { success: true, learners };
    } catch (error) {
        console.error('[LearnerAction] Error fetching learners:', error);
        return { success: false, error: 'Failed to fetch learners' };
    }
}

export async function getLearnerDetailsAction(id: string) {
    try {
        const learner = await (prisma as any).learner.findUnique({
            where: { id },
            include: {
                folders: {
                    include: {
                        training: true,
                        documents: true
                    },
                    orderBy: { createdAt: 'desc' }
                },
                agency: true
            }
        });
        return { success: true, learner };
    } catch (error) {
        return { success: false, error: 'Failed to fetch learner details' };
    }
}

export async function updateLearnerAgencyAction(learnerId: string, agencyId: string | null) {
    try {
        await prisma.learner.update({
            where: { id: learnerId },
            data: { agencyId }
        });
        revalidatePath(`/app/learners/${learnerId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to update agency' };
    }
}

export async function updateLearnerFolderAction(folderId: string, data: any) {
    try {
        const folder = await prisma.learnerFolder.update({
            where: { id: folderId },
            data
        });
        revalidatePath('/app/learners');
        return { success: true, folder };
    } catch (error) {
        return { success: false, error: 'Failed to update folder' };
    }
}

// ============================================
// LEARNER ACCESS MANAGEMENT
// ============================================

export async function grantLearnerAccessAction(learnerId: string, email: string) {
    try {
        const learner = await prisma.learner.findUnique({
            where: { id: learnerId }
        });

        if (!learner) return { success: false, error: 'Apprenant introuvable.' };

        // Check if user already exists
        let user = await prisma.user.findUnique({
            where: { email }
        });

        // Generate random temp password
        const tempPassword = Math.random().toString(36).slice(-8);

        if (!user) {
            // Create new User
            // Note: In production, hash the password properly!
            user = await prisma.user.create({
                data: {
                    email,
                    firstName: learner.firstName,
                    lastName: learner.lastName,
                    hashedPassword: tempPassword, // Placeholder for hash
                    isActive: true
                }
            });

            // Create Access Grant for this Org as LEARNER role?
            // "LEARNER" role ID assumed to exist or be standard string
            await prisma.userAccessGrant.create({
                data: {
                    userId: user.id,
                    organisationId: learner.organisationId,
                    roleId: 'LEARNER'
                }
            });
        }

        // Link Learner to User
        await prisma.learner.update({
            where: { id: learnerId },
            data: { userId: user.id }
        });

        revalidatePath('/app/admin/learners');
        return { success: true, data: { user, tempPassword } }; // Return temp password to display
    } catch (error) {
        console.error('[LearnerAction] Error granting access:', error);
        return { success: false, error: 'Failed to grant access.' };
    }
}
