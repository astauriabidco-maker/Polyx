
'use server';

import { GamificationService } from "../services/gamification.service";
import { prisma } from "@/lib/prisma";
// import { ensureAuthenticated } from "@/lib/auth"; 

// Wrapper to get leaderboard
export async function getLeaderboardAction(organisationId: string) {
    try {
        // Simple auth check
        // const session = await getSession(); 
        // if (!session) return { success: false, error: "Unauthorized" };

        const leaderboard = await GamificationService.getLeaderboard(organisationId);
        return { success: true, leaderboard };
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return { success: false, error: "Failed to fetch leaderboard" };
    }
}

export async function getMyGamificationProfileAction(userId: string) {
    // Note: In real app, verify session includes this userId or use session.user.id
    try {
        const prismaAny = prisma as any;
        const profile = await prismaAny.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                gamificationScore: true,
                gamificationLevel: true,
                achievements: {
                    include: { achievement: true }
                }
            }
        });

        // Fetch ALL available achievements to show locked ones too
        const allAchievements = await prismaAny.achievement.findMany({
            orderBy: { points: 'asc' }
        });

        return { success: true, profile, allAchievements };
    } catch (error) {
        console.error("Error fetching gamification profile:", error);
        return { success: false };
    }
}
