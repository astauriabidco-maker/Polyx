'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- EXAM CATALOG ---

export async function getExamsAction(organisationId: string) {
    try {
        const exams = await (prisma as any).exam.findMany({
            where: { organisationId, isActive: true },
            orderBy: { name: 'asc' }
        });
        return { success: true, exams };
    } catch (error) {
        console.error("Get Exams Error:", error);
        return { success: false, error: "Failed to fetch exams" };
    }
}

// --- EXAM SESSIONS ---

export async function getExamSessionsAction(organisationId: string) {
    try {
        const sessions = await (prisma as any).examSession.findMany({
            where: { organisationId },
            include: {
                exam: true,
                _count: {
                    select: { registrations: true }
                }
            },
            orderBy: { date: 'asc' }
        });
        return { success: true, sessions };
    } catch (error) {
        console.error("Get Sessions Error:", error);
        return { success: false, error: "Failed to fetch exam sessions" };
    }
}

export async function createExamSessionAction(data: {
    organisationId: string;
    examId: string;
    agencyId?: string;
    date: Date;
    location: string;
    minSpots: number;
    totalSpots: number;
    priceHt: number;
}) {
    try {
        let agencyName = "RESEAU";
        if (data.agencyId) {
            const agency = await (prisma as any).agency.findUnique({
                where: { id: data.agencyId },
                select: { name: true }
            });
            if (agency) agencyName = agency.name.toUpperCase().replace(/\s+/g, '_');
        }
        const dateStr = new Date(data.date).toISOString().split('T')[0].replace(/-/g, '');
        const sessionName = `SESSION_${agencyName}_${dateStr}`;

        const session = await (prisma as any).examSession.create({
            data: {
                organisationId: data.organisationId,
                examId: data.examId,
                agencyId: data.agencyId,
                name: sessionName,
                date: data.date,
                location: data.location,
                minSpots: data.minSpots,
                totalSpots: data.totalSpots,
                priceHt: data.priceHt,
                status: "WAITING_FOR_REGISTRATION"
            }
        });

        // Mock Notification
        console.log(`[Notification] Mail & Popup sent to ${agencyName} for session ${sessionName}`);

        revalidatePath('/app/network');
        return { success: true, session };
    } catch (error) {
        console.error("Create Session Error:", error);
        return { success: false, error: "Failed to create exam session" };
    }
}

// --- REGISTRATIONS ---

export async function getEligibleLearnersAction(organisationId: string, searchTerm?: string) {
    try {
        const learners = await (prisma as any).learner.findMany({
            where: {
                organisationId,
                // On peut filtrer par agence si nécessaire, mais ici on prend tout l'org pour le siège
                folders: {
                    some: {
                        status: { in: ['IN_TRAINING', 'COMPLETED', 'ONBOARDING'] }
                    }
                },
                OR: searchTerm ? [
                    { firstName: { contains: searchTerm } },
                    { lastName: { contains: searchTerm } },
                    { email: { contains: searchTerm } }
                ] : undefined
            },
            include: {
                agency: true,
                folders: {
                    select: { externalFileId: true },
                    take: 1
                }
            },
            take: 10
        });
        return { success: true, learners };
    } catch (error) {
        console.error("Get Eligible Learners Error:", error);
        return { success: false, error: "Failed to fetch eligible learners" };
    }
}

export async function registerLearnerToSessionAction(data: {
    sessionId: string;
    learnerId: string;
    motivation?: string;
    idNumber?: string;
    nativeLanguage?: string;
    documentUrl?: string;
}) {
    try {
        // Check if session is open and has spots
        const session = await (prisma as any).examSession.findUnique({
            where: { id: data.sessionId },
            include: {
                _count: {
                    select: { registrations: true }
                }
            }
        });

        if (!session) return { success: false, error: "Session not found" };
        const allowedStatuses = ["WAITING_FOR_REGISTRATION", "OPEN"];
        if (!allowedStatuses.includes(session.status)) {
            return { success: false, error: "La session n'est plus ouverte aux inscriptions" };
        }
        if (session.totalSpots > 0 && session._count.registrations >= session.totalSpots) {
            return { success: false, error: "La session est complète" };
        }

        const registration = await (prisma as any).examRegistration.create({
            data: {
                sessionId: data.sessionId,
                learnerId: data.learnerId,
                motivation: data.motivation,
                idNumber: data.idNumber,
                nativeLanguage: data.nativeLanguage,
                documentUrl: data.documentUrl,
                status: "WAITING_FOR_VALIDATION" // New default status
            }
        });

        revalidatePath('/app/network');
        revalidatePath('/app/learners');
        return { success: true, registration };
    } catch (error: any) {
        if (error.code === 'P2002') {
            return { success: false, error: "Cet apprenant est déjà inscrit à cette session" };
        }
        console.error("Registration Error:", error);
        return { success: false, error: "Failed to register learner" };
    }
}

export async function getRegistrationsForSessionAction(sessionId: string) {
    try {
        const registrations = await (prisma as any).examRegistration.findMany({
            where: { sessionId },
            include: {
                learner: {
                    include: {
                        agency: {
                            select: { name: true, franchise: { select: { name: true } } }
                        }
                    }
                }
            }
        });
        return { success: true, registrations };
    } catch (error) {
        console.error("Get Registrations Error:", error);
        return { success: false, error: "Failed to fetch registrations" };
    }
}

export async function updateRegistrationStatusAction(registrationId: string, status: string, score?: string) {
    try {
        const registration = await (prisma as any).examRegistration.update({
            where: { id: registrationId },
            data: { status, score }
        });
        revalidatePath('/app/network');
        return { success: true, registration };
    } catch (error) {
        console.error("Update Registration Error:", error);
        return { success: false, error: "Failed to update registration" };
    }
}

export async function updateSessionStatusAction(sessionId: string, status: string) {
    try {
        const session = await (prisma as any).examSession.findUnique({
            where: { id: sessionId },
            include: { _count: { select: { registrations: true } } }
        });

        if (!session) return { success: false, error: "Session not found" };

        // Quorum check for agency validation
        if (status === "VALIDATION_PENDING" && session._count.registrations < session.minSpots) {
            return { success: false, error: `Le nombre minimum de candidats (${session.minSpots}) n'est pas atteint.` };
        }

        const updated = await (prisma as any).examSession.update({
            where: { id: sessionId },
            data: { status }
        });

        revalidatePath('/app/network');
        return { success: true, session: updated };
    } catch (error) {
        console.error("Update Session Status Error:", error);
        return { success: false, error: "Failed to update session status" };
    }
}

export async function confirmSessionAction(sessionId: string) {
    try {
        const session = await (prisma as any).examSession.findUnique({
            where: { id: sessionId },
            include: { registrations: true }
        });

        if (!session) return { success: false, error: "Session not found" };

        // Confirm session and all its registrations
        await (prisma as any).examSession.update({
            where: { id: sessionId },
            data: { status: "CONFIRMED" }
        });

        await (prisma as any).examRegistration.updateMany({
            where: { sessionId, status: "WAITING_FOR_VALIDATION" },
            data: { status: "REGISTERED" }
        });

        // Trigger billing / invoice generation placeholder
        console.log(`[Billing] Auto-invoice triggered for session ${session.name}`);

        revalidatePath('/app/network');
        return { success: true };
    } catch (error) {
        console.error("Confirm Session Error:", error);
        return { success: false, error: "Failed to confirm session" };
    }
}
