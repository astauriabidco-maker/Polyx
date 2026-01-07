'use server';

import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';
import { LmsService } from '@/application/services/lms.service';

/**
 * Get current LMS settings (masked keys)
 */
export async function getLmsSettingsAction(orgId: string) {
    try {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config) return { success: true, data: null };

        return {
            success: true,
            data: {
                lmsEnabled: config.lmsEnabled,
                lmsProvider: config.lmsProvider,
                lmsApiUrl: config.lmsApiUrl,
                lmsApiKey: config.lmsApiKey ? '••••••••' + config.lmsApiKey.slice(-4) : '',
                lmsApiSecret: config.lmsApiSecret ? '••••••••' : '',
                lmsLastTestedAt: config.lmsLastTestedAt,
                lmsTestStatus: config.lmsTestStatus
            }
        };
    } catch (error) {
        return { success: false, error: "Failed to fetch LMS settings" };
    }
}

/**
 * Save LMS Configuration
 */
export async function saveLmsConfigAction(
    orgId: string,
    data: {
        enabled: boolean;
        provider: 'MOODLE' | '360LEARNING';
        apiUrl?: string;
        apiKey?: string;
        apiSecret?: string;
    }
) {
    try {
        const existing = await prisma.integrationConfig.findUnique({ where: { organisationId: orgId } });

        let finalKey = existing?.lmsApiKey;
        let finalSecret = existing?.lmsApiSecret;

        // Encrypt if changed (and not masked)
        if (data.apiKey && !data.apiKey.startsWith('••••')) {
            finalKey = encrypt(data.apiKey);
        }
        if (data.apiSecret && !data.apiSecret.startsWith('••••')) {
            finalSecret = encrypt(data.apiSecret);
        }

        await prisma.integrationConfig.upsert({
            where: { organisationId: orgId },
            update: {
                lmsEnabled: data.enabled,
                lmsProvider: data.provider,
                lmsApiUrl: data.apiUrl,
                lmsApiKey: finalKey,
                lmsApiSecret: finalSecret
            },
            create: {
                organisationId: orgId,
                lmsEnabled: data.enabled,
                lmsProvider: data.provider,
                lmsApiUrl: data.apiUrl,
                lmsApiKey: finalKey,
                lmsApiSecret: finalSecret
            }
        });

        revalidatePath('/app/settings/integrations');
        return { success: true };
    } catch (error) {
        console.error("Save LMS Config Error:", error);
        return { success: false, error: "Failed to save configuration" };
    }
}

/**
 * Test LMS Connection
 */
export async function testLmsConnectionAction(orgId: string) {
    try {
        const res = await LmsService.testConnection(orgId);

        await prisma.integrationConfig.update({
            where: { organisationId: orgId },
            data: {
                lmsLastTestedAt: new Date(),
                lmsTestStatus: res.success ? 'success' : 'failed'
            }
        });

        revalidatePath('/app/settings/integrations');
        return res;
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Enroll a learner in an LMS course
 */
export async function enrollLearnerInLmsAction(
    orgId: string,
    data: {
        email: string;
        firstName: string;
        lastName: string;
        externalCourseId: string;
    }
) {
    return LmsService.enrollLearner(orgId, data);
}

/**
 * Get grades from LMS
 */
export async function getLmsGradesAction(
    orgId: string,
    externalUserId: string,
    externalCourseId: string
) {
    return LmsService.getGrades(orgId, { externalUserId, externalCourseId });
}

/**
 * List available courses in LMS
 */
export async function listLmsCoursesAction(orgId: string) {
    return LmsService.listCourses(orgId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LMS AUTOMATION ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

import { LmsAutomationService } from '@/application/services/lms-automation.service';

/**
 * Sync grades for all active learner folders
 */
export async function syncAllLmsGradesAction(orgId: string) {
    try {
        const result = await LmsAutomationService.syncAllGrades(orgId);
        revalidatePath('/app/learners');
        return result;
    } catch (error: any) {
        return { success: false, synced: 0, failed: 0, errors: [error.message] };
    }
}

/**
 * Sync grades for a single folder
 */
export async function syncFolderGradesAction(folderId: string) {
    try {
        const result = await LmsAutomationService.syncFolderGrades(folderId);
        revalidatePath('/app/learners');
        return result;
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Auto-enroll a learner after folder creation
 */
export async function autoEnrollLearnerAction(folderId: string) {
    try {
        const result = await LmsAutomationService.autoEnrollLearner(folderId);
        revalidatePath('/app/learners');
        return result;
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
