/**
 * LMS Service for Polyx
 * Supports Moodle and 360Learning for learner enrollment and grade retrieval.
 */
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

type LmsProvider = 'MOODLE' | '360LEARNING';

interface LmsConfig {
    provider: LmsProvider;
    apiUrl: string;
    apiKey: string;
    apiSecret?: string;
}

export class LmsService {

    /**
     * Fetches the LMS configuration for an organization
     */
    private static async getConfig(orgId: string): Promise<LmsConfig | null> {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config || !config.lmsEnabled || !config.lmsApiUrl || !config.lmsApiKey) {
            return null;
        }

        return {
            provider: (config.lmsProvider as LmsProvider) || 'MOODLE',
            apiUrl: config.lmsApiUrl,
            apiKey: decrypt(config.lmsApiKey),
            apiSecret: config.lmsApiSecret ? decrypt(config.lmsApiSecret) : undefined
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // MOODLE ADAPTER
    // ═══════════════════════════════════════════════════════════════════════════════

    private static async moodleCall(config: LmsConfig, wsfunction: string, params: Record<string, any> = {}) {
        const url = new URL(`${config.apiUrl}/webservice/rest/server.php`);
        url.searchParams.set('wstoken', config.apiKey);
        url.searchParams.set('moodlewsrestformat', 'json');
        url.searchParams.set('wsfunction', wsfunction);

        // Add all params to URL
        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'object') {
                // Handle arrays/objects for Moodle format
                const flatParams = this.flattenMoodleParams(key, value);
                for (const [k, v] of Object.entries(flatParams)) {
                    url.searchParams.set(k, String(v));
                }
            } else {
                url.searchParams.set(key, String(value));
            }
        }

        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.exception) {
            throw new Error(`Moodle Error: ${data.message}`);
        }

        return data;
    }

    private static flattenMoodleParams(prefix: string, obj: any): Record<string, any> {
        const result: Record<string, any> = {};
        if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                if (typeof item === 'object') {
                    Object.assign(result, this.flattenMoodleParams(`${prefix}[${index}]`, item));
                } else {
                    result[`${prefix}[${index}]`] = item;
                }
            });
        } else if (typeof obj === 'object') {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'object') {
                    Object.assign(result, this.flattenMoodleParams(`${prefix}[${key}]`, value));
                } else {
                    result[`${prefix}[${key}]`] = value;
                }
            }
        }
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 360LEARNING ADAPTER
    // ═══════════════════════════════════════════════════════════════════════════════

    private static async threeSixtyCall(config: LmsConfig, method: string, endpoint: string, body?: any) {
        const url = `${config.apiUrl}/api/v2${endpoint}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        };

        if (config.apiSecret) {
            headers['X-API-Secret'] = config.apiSecret;
        }

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`360Learning Error: ${err.message || response.statusText}`);
        }

        return response.json();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // PUBLIC METHODS
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Test LMS connection
     */
    static async testConnection(orgId: string): Promise<{ success: boolean; info?: any; error?: string }> {
        const config = await this.getConfig(orgId);
        if (!config) return { success: false, error: "LMS non configuré" };

        try {
            if (config.provider === 'MOODLE') {
                const siteInfo = await this.moodleCall(config, 'core_webservice_get_site_info');
                return { success: true, info: { sitename: siteInfo.sitename, username: siteInfo.username } };
            } else if (config.provider === '360LEARNING') {
                const me = await this.threeSixtyCall(config, 'GET', '/me');
                return { success: true, info: { email: me.email, name: me.fullName } };
            }
            return { success: false, error: "Provider non supporté" };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Enroll a learner in an external course
     */
    static async enrollLearner(orgId: string, data: {
        externalUserId?: string;
        email: string;
        firstName: string;
        lastName: string;
        externalCourseId: string;
    }): Promise<{ success: boolean; enrollmentId?: string; error?: string }> {
        const config = await this.getConfig(orgId);
        if (!config) return { success: false, error: "LMS non configuré" };

        try {
            if (config.provider === 'MOODLE') {
                // First, find or create user
                let userId = data.externalUserId;

                if (!userId) {
                    // Search for user by email
                    const users = await this.moodleCall(config, 'core_user_get_users', {
                        criteria: [{ key: 'email', value: data.email }]
                    });

                    if (users.users && users.users.length > 0) {
                        userId = users.users[0].id;
                    } else {
                        // Create user
                        const created = await this.moodleCall(config, 'core_user_create_users', {
                            users: [{
                                username: data.email.split('@')[0] + '_' + Date.now(),
                                email: data.email,
                                firstname: data.firstName,
                                lastname: data.lastName,
                                password: 'TempPass123!',
                                auth: 'manual'
                            }]
                        });
                        userId = created[0]?.id;
                    }
                }

                // Enroll user (role 5 = student typically)
                await this.moodleCall(config, 'enrol_manual_enrol_users', {
                    enrolments: [{
                        roleid: 5,
                        userid: userId,
                        courseid: data.externalCourseId
                    }]
                });

                return { success: true, enrollmentId: `moodle_${userId}_${data.externalCourseId}` };

            } else if (config.provider === '360LEARNING') {
                // 360Learning enrollment
                await this.threeSixtyCall(config, 'PUT', `/courses/${data.externalCourseId}/users/${data.externalUserId || data.email}`, {
                    email: data.email,
                    firstName: data.firstName,
                    lastName: data.lastName
                });

                return { success: true, enrollmentId: `360l_${data.email}_${data.externalCourseId}` };
            }

            return { success: false, error: "Provider non supporté" };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get grades/completion for a learner
     */
    static async getGrades(orgId: string, data: {
        externalUserId: string;
        externalCourseId: string;
    }): Promise<{ success: boolean; grades?: any; error?: string }> {
        const config = await this.getConfig(orgId);
        if (!config) return { success: false, error: "LMS non configuré" };

        try {
            if (config.provider === 'MOODLE') {
                const grades = await this.moodleCall(config, 'gradereport_user_get_grade_items', {
                    courseid: data.externalCourseId,
                    userid: data.externalUserId
                });

                return {
                    success: true,
                    grades: {
                        items: grades.usergrades?.[0]?.gradeitems || [],
                        total: grades.usergrades?.[0]?.gradeitems?.find((g: any) => g.itemtype === 'course')?.graderaw
                    }
                };

            } else if (config.provider === '360LEARNING') {
                const progress = await this.threeSixtyCall(config, 'GET', `/users/${data.externalUserId}/courses/${data.externalCourseId}/progress`);

                return {
                    success: true,
                    grades: {
                        completion: progress.completionPercentage,
                        score: progress.score,
                        status: progress.status
                    }
                };
            }

            return { success: false, error: "Provider non supporté" };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * List available courses from LMS
     */
    static async listCourses(orgId: string): Promise<{ success: boolean; courses?: any[]; error?: string }> {
        const config = await this.getConfig(orgId);
        if (!config) return { success: false, error: "LMS non configuré" };

        try {
            if (config.provider === 'MOODLE') {
                const courses = await this.moodleCall(config, 'core_course_get_courses');
                return {
                    success: true,
                    courses: courses.map((c: any) => ({
                        id: c.id,
                        name: c.fullname,
                        shortname: c.shortname
                    }))
                };

            } else if (config.provider === '360LEARNING') {
                const courses = await this.threeSixtyCall(config, 'GET', '/courses');
                return {
                    success: true,
                    courses: courses.map((c: any) => ({
                        id: c.id,
                        name: c.title
                    }))
                };
            }

            return { success: false, error: "Provider non supporté" };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
