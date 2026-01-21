/**
 * LMS Automation Service
 * Handles automatic enrollment and grade synchronization with external LMS
 */
import { prisma } from '@/lib/prisma';
import { LmsService } from './lms.service';

export class LmsAutomationService {

    /**
     * Auto-enroll a learner in LMS when folder is created/updated
     * Called after LearnerFolder creation if training has externalCourseId
     */
    static async autoEnrollLearner(folderId: string): Promise<{ success: boolean; enrollmentId?: string; error?: string }> {
        try {
            const folder = await prisma.learnerFolder.findUnique({
                where: { id: folderId },
                include: {
                    learner: true,
                    training: true
                }
            });

            if (!folder) {
                return { success: false, error: "Dossier non trouvé" };
            }

            // Check if training has LMS course configured
            if (!folder.training?.externalCourseId) {
                console.log('[LMS-AUTO] Training has no externalCourseId, skipping enrollment');
                return { success: true }; // Not an error, just nothing to do
            }

            // Check if already enrolled
            if (folder.lmsEnrollmentId) {
                console.log('[LMS-AUTO] Already enrolled:', folder.lmsEnrollmentId);
                return { success: true, enrollmentId: folder.lmsEnrollmentId };
            }

            // Get org ID from training
            const orgId = folder.training.organisationId;

            // Enroll in LMS
            const result = await LmsService.enrollLearner(orgId, {
                email: folder.learner.email,
                firstName: folder.learner.firstName,
                lastName: folder.learner.lastName,
                externalCourseId: folder.training.externalCourseId
            });

            if (result.success && result.enrollmentId) {
                // Update folder with enrollment info
                await prisma.learnerFolder.update({
                    where: { id: folderId },
                    data: {
                        lmsEnrollmentId: result.enrollmentId,
                        lmsEnrolledAt: new Date()
                    }
                });

                console.log('[LMS-AUTO] Enrolled successfully:', result.enrollmentId);
                return { success: true, enrollmentId: result.enrollmentId };
            }

            return result;
        } catch (error: any) {
            console.error('[LMS-AUTO] Enrollment error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sync grades for a single folder
     */
    static async syncFolderGrades(folderId: string): Promise<{ success: boolean; grade?: number; completion?: number; error?: string }> {
        try {
            const folder = await prisma.learnerFolder.findUnique({
                where: { id: folderId },
                include: {
                    learner: true,
                    training: true
                }
            });

            if (!folder || !folder.training?.externalCourseId || !folder.lmsEnrollmentId) {
                return { success: false, error: "Dossier non configuré pour LMS" };
            }

            const orgId = folder.training.organisationId;

            // Extract user ID from enrollment ID format: "moodle_{userId}_{courseId}" or "360l_{email}_{courseId}"
            const enrollmentParts = folder.lmsEnrollmentId.split('_');
            const externalUserId = enrollmentParts.length >= 2 ? enrollmentParts[1] : folder.learner.email;

            const result = await LmsService.getGrades(orgId, {
                externalUserId,
                externalCourseId: folder.training.externalCourseId
            });

            if (result.success && result.grades) {
                // Update folder with grades
                const grade = result.grades.total || result.grades.score || null;
                const completion = result.grades.completion || null;

                await prisma.learnerFolder.update({
                    where: { id: folderId },
                    data: {
                        lmsGrade: grade,
                        lmsCompletion: completion,
                        lmsLastSyncAt: new Date()
                    }
                });

                return { success: true, grade, completion };
            }

            return { success: false, error: result.error };
        } catch (error: any) {
            console.error('[LMS-AUTO] Grade sync error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sync grades for all active folders in an organization
     */
    static async syncAllGrades(orgId: string): Promise<{ success: boolean; synced: number; failed: number; errors: string[] }> {
        const errors: string[] = [];
        let synced = 0;
        let failed = 0;

        try {
            // Get all folders with LMS enrollment
            const folders = await prisma.learnerFolder.findMany({
                where: {
                    lmsEnrollmentId: { not: null },
                    training: {
                        organisationId: orgId,
                        externalCourseId: { not: null }
                    },
                    status: { in: ['ONBOARDING', 'IN_TRAINING'] }
                },
                select: { id: true }
            });

            console.log(`[LMS-AUTO] Syncing grades for ${folders.length} folders`);

            for (const folder of folders) {
                const result = await this.syncFolderGrades(folder.id);
                if (result.success) {
                    synced++;
                } else {
                    failed++;
                    if (result.error) errors.push(`${folder.id}: ${result.error}`);
                }
            }

            return { success: true, synced, failed, errors };
        } catch (error: any) {
            return { success: false, synced, failed, errors: [error.message] };
        }
    }
}
