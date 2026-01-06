'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GeminiService } from "../services/gemini.service";
import { CommunicationService } from "../services/communication.service";
import { subDays } from "date-fns";

export async function submitSatisfactionSurveyAction(data: {
    folderId: string;
    rating: number;
    type?: "HOT" | "COLD";
    contentQuality?: number;
    pacingQuality?: number;
    supportQuality?: number;
    comment?: string;
}) {
    try {
        // AI Analysis with Gemini
        let aiAnalysis = { sentiment: 'NEUTRAL', tags: 'Général', summary: '' };
        if (data.comment) {
            aiAnalysis = await GeminiService.analyzeFeedback(data.comment);
        }

        const survey = await (prisma as any).satisfactionSurvey.create({
            data: {
                folderId: data.folderId,
                type: data.type || "HOT",
                rating: data.rating,
                contentQuality: data.contentQuality,
                pacingQuality: data.pacingQuality,
                supportQuality: data.supportQuality,
                comment: data.comment,
                sentiment: aiAnalysis.sentiment,
                tags: aiAnalysis.tags,
                summary: aiAnalysis.summary
            }
        });

        // Trigger Alert if negative sentiment
        if (aiAnalysis.sentiment === 'NEGATIVE') {
            console.log(`[ALERT] 🚩 Negative feedback detected for folder ${data.folderId}`);
        }

        revalidatePath(`/app/learners`);
        return { success: true, survey };
    } catch (error) {
        console.error("Submit Survey Error:", error);
        return { success: false, error: "Erreur lors de l'envoi de l'avis. Avez-vous déjà répondu ?" };
    }
}

export async function getFolderSurveyAction(folderId: string) {
    try {
        const survey = await (prisma as any).satisfactionSurvey.findUnique({
            where: { folderId }
        });
        return { success: true, survey };
    } catch (error) {
        console.error("Get Survey Error:", error);
        return { success: false, error: "Erreur lors de la récupération de l'avis." };
    }
}

export async function getGlobalQualityStatsAction(organisationId: string) {
    try {
        const surveys = await (prisma as any).satisfactionSurvey.findMany({
            where: {
                folder: {
                    learner: { organisationId }
                }
            }
        });

        if (surveys.length === 0) return { success: true, stats: null };

        const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

        const stats = {
            totalCount: surveys.length,
            averageRating: avg(surveys.map((s: any) => s.rating)).toFixed(1),
            averageContent: avg(surveys.map((s: any) => s.contentQuality || 0).filter((v: number) => v > 0)).toFixed(1),
            averagePacing: avg(surveys.map((s: any) => s.pacingQuality || 0).filter((v: number) => v > 0)).toFixed(1),
            averageSupport: avg(surveys.map((s: any) => s.supportQuality || 0).filter((v: number) => v > 0)).toFixed(1),
        };

        return { success: true, stats };
    } catch (error) {
        console.error("Global Quality Stats Error:", error);
        return { success: false, error: "Erreur lors du calcul des statistiques." };
    }
}

export async function getVerbatimsAction(organisationId: string) {
    try {
        const verbatims = await (prisma as any).satisfactionSurvey.findMany({
            where: {
                folder: {
                    learner: { organisationId }
                }
            },
            include: {
                folder: {
                    include: { learner: true }
                }
            },
            orderBy: { answeredAt: 'desc' }
        });
        return { success: true, verbatims };
    } catch (error) {
        console.error("Get Verbatims Error:", error);
        return { success: false, error: "Erreur lors de la récupération des verbatims." };
    }
}

/**
 * Automate cold surveys (Indicateur 30 - Qualiopi)
 * Finds folders that ended 90 days ago and send an email if not already done.
 */
export async function runColdSurveySchedulerAction(organisationId: string) {
    try {
        const ninetyDaysAgo = subDays(new Date(), 90);

        // Find folders that ended around 90 days ago (+/- 3 days for safety window)
        // and dont have a COLD survey yet.
        const folders = await (prisma as any).learnerFolder.findMany({
            where: {
                learner: { organisationId },
                status: 'COMPLETED',
                actualEndDate: {
                    lte: subDays(ninetyDaysAgo, 0),
                    gte: subDays(ninetyDaysAgo, 7)
                },
                surveys: {
                    none: { type: 'COLD' }
                }
            },
            include: {
                learner: { include: { organisation: true } }
            }
        });

        console.log(`[SCHEDULER] ❄️ Found ${folders.length} folders for Cold Survey`);

        const domain = process.env.NEXT_PUBLIC_APP_URL || 'https://polyx-app.vercel.app';

        for (const folder of folders) {
            await CommunicationService.sendColdSurveyEmail({
                to: folder.learner.email,
                learnerName: `${folder.learner.firstName} ${folder.learner.lastName}`,
                trainingTitle: folder.trainingTitle || "Formation Polyx",
                organisationName: folder.learner.organisation.name,
                surveyUrl: `${domain}/survey/${folder.id}?type=COLD`
            });
        }

        return { success: true, count: folders.length };
    } catch (error) {
        console.error("Scheduler Error:", error);
        return { success: false, error: "Erreur lors du traitement des enquêtes à froid." };
    }
}

// --- COMPLAINTS ACTIONS (Indicateur 34) ---

export async function createComplaintAction(data: {
    folderId: string;
    type: string;
    subject: string;
    content: string;
    priority?: string;
}) {
    try {
        const complaint = await (prisma as any).complaint.create({
            data: {
                folderId: data.folderId,
                type: data.type,
                subject: data.subject,
                content: data.content,
                priority: data.priority || "MEDIUM",
                status: "OPEN"
            }
        });
        revalidatePath('/app/quality');
        return { success: true, complaint };
    } catch (error) {
        console.error("Create Complaint Error:", error);
        return { success: false, error: "Erreur lors de la création de la réclamation." };
    }
}

export async function updateComplaintStatusAction(complaintId: string, status: string, resolution?: string) {
    try {
        const complaint = await (prisma as any).complaint.update({
            where: { id: complaintId },
            data: {
                status,
                resolution: resolution || undefined,
                resolvedAt: status === 'RESOLVED' ? new Date() : undefined
            }
        });
        revalidatePath('/app/quality');
        return { success: true, complaint };
    } catch (error) {
        console.error("Update Complaint Error:", error);
        return { success: false, error: "Erreur lors de la mise à jour." };
    }
}

export async function getComplaintsAction(organisationId: string) {
    try {
        const complaints = await (prisma as any).complaint.findMany({
            where: {
                folder: {
                    learner: { organisationId }
                }
            },
            include: {
                folder: {
                    include: { learner: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, complaints };
    } catch (error) {
        console.error("Get Complaints Error:", error);
        return { success: false, error: "Erreur lors de la récupération des réclamations." };
    }
}
