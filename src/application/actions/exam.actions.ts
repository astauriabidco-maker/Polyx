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
    date: Date;
    location: string;
    totalSpots: number;
    priceHt: number;
}) {
    try {
        const session = await (prisma as any).examSession.create({
            data: {
                organisationId: data.organisationId,
                examId: data.examId,
                date: data.date,
                location: data.location,
                totalSpots: data.totalSpots,
                priceHt: data.priceHt,
                status: "OPEN"
            }
        });
        revalidatePath('/app/network');
        return { success: true, session };
    } catch (error) {
        console.error("Create Session Error:", error);
        return { success: false, error: "Failed to create exam session" };
    }
}

// --- REGISTRATIONS ---

export async function registerLearnerToSessionAction(sessionId: string, learnerId: string) {
    try {
        // Check if session is open and has spots
        const session = await (prisma as any).examSession.findUnique({
            where: { id: sessionId },
            include: {
                _count: {
                    select: { registrations: true }
                }
            }
        });

        if (!session) return { success: false, error: "Session not found" };
        if (session.status !== "OPEN") return { success: false, error: "Session is not open for registration" };
        if (session.totalSpots > 0 && session._count.registrations >= session.totalSpots) {
            return { success: false, error: "Session is full" };
        }

        const registration = await (prisma as any).examRegistration.create({
            data: {
                sessionId,
                learnerId,
                status: "REGISTERED"
            }
        });

        revalidatePath('/app/network');
        revalidatePath('/app/learners');
        return { success: true, registration };
    } catch (error: any) {
        if (error.code === 'P2002') {
            return { success: false, error: "Learner is already registered for this session" };
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
