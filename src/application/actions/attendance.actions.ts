'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAgencyAccess, getAgencyWhereClause } from "@/lib/auth-utils";

// --- SESSION ACTIONS ---

export async function getTrainingsAction(organisationId: string) {
    try {
        const trainings = await (prisma as any).training.findMany({
            where: { organisationId, isActive: true },
            orderBy: { title: 'asc' }
        });
        return { success: true, trainings };
    } catch (error) {
        console.error("Get Trainings Error:", error);
        return { success: false, error: "Failed to fetch trainings" };
    }
}

export async function getFormateursAction(organisationId: string) {
    try {
        const grants = await (prisma as any).userAccessGrant.findMany({
            where: {
                organisationId,
                role: {
                    name: { contains: 'Formateur' }
                }
            },
            include: { user: true }
        });

        // If no specifically named formateurs found, fallback to all users in org
        let formateurUsers = grants.map((g: any) => g.user);

        if (formateurUsers.length === 0) {
            const allGrants = await (prisma as any).userAccessGrant.findMany({
                where: { organisationId },
                include: { user: true }
            });
            formateurUsers = allGrants.map((g: any) => g.user);
        }

        return { success: true, users: formateurUsers };
    } catch (error) {
        console.error("Get Formateurs Error:", error);
        return { success: false, error: "Failed to fetch formateurs" };
    }
}

export async function createTrainingSessionAction(data: {
    organisationId: string;
    trainingId?: string;
    formateurId?: string;
    formateurName?: string;
    date: Date;
    startTime?: string;
    endTime?: string;
    title?: string;
    location?: string;
    agencyId?: string;
}) {
    try {
        if (data.agencyId) {
            const access = await checkAgencyAccess(data.organisationId, data.agencyId);
            if (!access.isAllowed) return { success: false, error: "Vous n'êtes pas autorisé à créer une session pour cette agence." };
        }

        const session = await (prisma as any).trainingSession.create({
            data: {
                organisationId: data.organisationId,
                trainingId: data.trainingId,
                formateurId: data.formateurId,
                formateurName: data.formateurName,
                date: data.date,
                startTime: data.startTime,
                endTime: data.endTime,
                title: data.title,
                location: data.location,
                agencyId: data.agencyId,
            }
        });
        revalidatePath('/app/attendance');
        return { success: true, session };
    } catch (error) {
        console.error("Create Session Error:", error);
        return { success: false, error: "Failed to create session" };
    }
}

export async function getTrainingSessionsAction(organisationId: string, agencyId?: string) {
    try {
        const whereClause = await getAgencyWhereClause(organisationId, agencyId);

        const sessions = await (prisma as any).trainingSession.findMany({
            where: whereClause,
            include: {
                training: true,
                attendanceLogs: {
                    include: {
                        folder: {
                            include: { learner: true }
                        }
                    }
                }
            },
            orderBy: { date: 'desc' }
        });

        return { success: true, sessions };
    } catch (error) {
        console.error("Get Sessions Error:", error);
        return { success: false, error: "Failed to fetch sessions" };
    }
}

export async function getSessionDetailsAction(sessionId: string) {
    try {
        const session = await (prisma as any).trainingSession.findUnique({
            where: { id: sessionId },
            include: {
                organisation: true,
                training: true,
                attendanceLogs: {
                    include: {
                        folder: {
                            include: { learner: true }
                        }
                    }
                }
            }
        });
        return { success: true, session };
    } catch (error) {
        console.error("Get Session Details Error:", error);
        return { success: false, error: "Failed to fetch session details" };
    }
}

// --- ATTENDANCE ACTIONS ---

export async function markAttendanceAction(folderId: string, signature: string, sessionId: string, duration: number) {
    try {
        // Find existing or create new
        const log = await prisma.$transaction(async (tx: any) => {
            const existing = await tx.attendanceLog.findFirst({
                where: { sessionId, folderId }
            });

            let attendanceLog;
            if (existing) {
                attendanceLog = await tx.attendanceLog.update({
                    where: { id: existing.id },
                    data: { signature, duration, status: 'SIGNED' }
                });
            } else {
                attendanceLog = await tx.attendanceLog.create({
                    data: {
                        sessionId,
                        folderId,
                        signature,
                        duration,
                        status: 'SIGNED',
                        date: new Date()
                    }
                });
            }

            // Update hoursUsed in folder (simplified sum)
            const allLogs = await tx.attendanceLog.findMany({
                where: { folderId }
            });
            const totalHours = allLogs.reduce((sum: number, l: any) => sum + (l.duration || 0), 0);

            await tx.learnerFolder.update({
                where: { id: folderId },
                data: { hoursUsed: totalHours }
            });

            return attendanceLog;
        });

        revalidatePath(`/app/attendance/sessions/${sessionId}`);
        return { success: true, log };
    } catch (error) {
        console.error("Mark Attendance Error:", error);
        return { success: false, error: "Failed to mark attendance" };
    }
}
