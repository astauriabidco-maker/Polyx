'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getTrainingSessionsAction(organisationId: string, agencyId?: string) {
    try {
        const sessions = await (prisma as any).trainingSession.findMany({
            where: {
                organisationId,
                agencyId: agencyId || undefined
            },
            include: {
                training: { select: { name: true, code: true } },
                _count: { select: { attendanceLogs: true } }
            },
            orderBy: { date: 'desc' }
        });
        return { success: true, sessions };
    } catch (error) {
        console.error("Get Training Sessions Error:", error);
        return { success: false, error: "Failed to fetch sessions" };
    }
}

export async function createTrainingSessionAction(data: {
    organisationId: string;
    trainingId: string;
    agencyId: string;
    date: Date;
    startTime: string;
    endTime: string;
    title: string;
    location: string;
    formateurId?: string;
    formateurName?: string;
}) {
    try {
        const session = await (prisma as any).trainingSession.create({
            data: {
                organisationId: data.organisationId,
                trainingId: data.trainingId,
                agencyId: data.agencyId,
                date: data.date,
                startTime: data.startTime,
                endTime: data.endTime,
                title: data.title,
                location: data.location,
                formateurId: data.formateurId,
                formateurName: data.formateurName,
                status: "OPEN"
            }
        });
        revalidatePath('/app/attendance');
        return { success: true, session };
    } catch (error) {
        console.error("Create Training Session Error:", error);
        return { success: false, error: "Failed to create session" };
    }
}

export async function getFormateursAction(organisationId: string) {
    try {
        const formateurs = await (prisma as any).user.findMany({
            where: {
                memberships: {
                    some: {
                        organisationId
                        // In real scenario, filter by role: 'FORMATEUR' or check permissions
                    }
                },
                isActive: true
            },
            select: { id: true, firstName: true, lastName: true }
        });
        return { success: true, formateurs };
    } catch (error) {
        console.error("Get Formateurs Error:", error);
        return { success: false, error: "Failed to fetch formateurs" };
    }
}

export async function getTrainingsAction(organisationId: string) {
    try {
        const trainings = await (prisma as any).training.findMany({
            where: { organisationId, isActive: true },
            select: { id: true, title: true, code: true }
        });
        return { success: true, trainings };
    } catch (error) {
        console.error("Get Trainings Error:", error);
        return { success: false, error: "Failed to fetch trainings" };
    }
}

export async function getSessionAttendanceAction(sessionId: string) {
    try {
        const logs = await (prisma as any).attendanceLog.findMany({
            where: { sessionId },
            include: {
                folder: {
                    include: {
                        learner: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, logs };
    } catch (error) {
        console.error("Get Session Attendance Error:", error);
        return { success: false, error: "Failed to fetch attendance" };
    }
}

export async function getSessionDetailsAction(sessionId: string) {
    try {
        const session = await (prisma as any).trainingSession.findUnique({
            where: { id: sessionId },
            include: {
                training: { select: { name: true, code: true } },
                agency: { select: { name: true, city: true } },
                _count: { select: { attendanceLogs: true } }
            }
        });

        if (!session) return { success: false, error: "Session non trouvée" };

        return { success: true, session };
    } catch (error) {
        console.error("Get Session Details Error:", error);
        return { success: false, error: "Erreur lors du chargement de la session" };
    }
}

export async function findLearnerForSigningAction(sessionId: string, searchTerm: string) {
    try {
        const session = await (prisma as any).trainingSession.findUnique({
            where: { id: sessionId },
            select: { organisationId: true }
        });

        if (!session) return { success: false, error: "Session non trouvée" };

        const learners = await (prisma as any).learner.findMany({
            where: {
                organisationId: session.organisationId,
                OR: [
                    { firstName: { contains: searchTerm } },
                    { lastName: { contains: searchTerm } },
                    { email: { contains: searchTerm } }
                ]
            },
            include: {
                folders: {
                    select: { id: true, trainingTitle: true, externalFileId: true },
                    take: 1
                }
            },
            take: 5
        });

        return { success: true, learners };
    } catch (error) {
        console.error("Find Learner Error:", error);
        return { success: false, error: "Erreur lors de la recherche" };
    }
}

export async function registerAttendanceAction(data: {
    sessionId: string;
    folderId: string;
    signature: string; // Base64
}) {
    try {
        const log = await (prisma as any).attendanceLog.create({
            data: {
                sessionId: data.sessionId,
                folderId: data.folderId,
                signature: data.signature,
                date: new Date(),
                duration: 180, // Par défaut 3h ou à calculer
                status: "SIGNED"
            }
        });
        revalidatePath('/app/attendance');
        return { success: true, log };
    } catch (error) {
        console.error("Register Attendance Error:", error);
        return { success: false, error: "Erreur lors de la signature" };
    }
}

// Alias for markAttendanceAction used in UI
export const markAttendanceAction = registerAttendanceAction;

export async function getLearnerCompletionAction(folderId: string) {
    try {
        const folder = await (prisma as any).learnerFolder.findUnique({
            where: { id: folderId },
            include: {
                learner: {
                    include: {
                        agency: true,
                        organisation: true
                    }
                },
                attendanceLogs: true
            }
        });

        if (!folder) return { success: false, error: "Dossier non trouvé" };

        const totalHours = folder.attendanceLogs.reduce((acc: number, log: any) => acc + (log.duration / 60), 0);

        return {
            success: true,
            data: {
                learnerName: `${folder.learner.firstName} ${folder.learner.lastName}`,
                trainingTitle: folder.trainingTitle,
                startDate: folder.actualStartDate || folder.createdAt,
                endDate: folder.actualEndDate || new Date(),
                totalHours: totalHours.toFixed(1),
                organisationName: folder.learner.organisation.name,
                organisationSiret: folder.learner.organisation.siret,
                organisationNda: folder.learner.organisation.nda,
                agencyName: folder.learner.agency?.name || "Siège",
                isQualiopi: folder.learner.organisation.qualiopi
            }
        };
    } catch (error) {
        console.error("Get Completion Error:", error);
        return { success: false, error: "Erreur lors du calcul de complétion" };
    }
}
