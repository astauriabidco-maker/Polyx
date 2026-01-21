
import { prisma } from "@/lib/prisma";
import { Achievement, UserAchievement } from "@prisma/client";

export enum GamificationActivity {
    CALL_MADE = 'CALL_MADE',
    DEAL_WON = 'DEAL_WON',
    LEAD_CONVERTED = 'LEAD_CONVERTED',
    APPOINTMENT_SET = 'APPOINTMENT_SET'
}

const XP_VALUES = {
    [GamificationActivity.CALL_MADE]: 10,
    [GamificationActivity.DEAL_WON]: 500,
    [GamificationActivity.LEAD_CONVERTED]: 50,
    [GamificationActivity.APPOINTMENT_SET]: 100
};

export class GamificationService {

    /**
     * Track an activity, award XP, and check for achievements
     */
    static async trackActivity(userId: string, activity: GamificationActivity, value: number = 1) {
        console.log(`🎮 [Gamification] Tracking ${activity} for user ${userId}`);

        // 1. Award XP
        const xpGained = (XP_VALUES[activity] || 0) * value;
        if (xpGained > 0) {
            await this.awardXP(userId, xpGained);
        }

        // 2. Check Achievements
        await this.checkAchievements(userId, activity);
    }

    private static async awardXP(userId: string, amount: number) {
        const user = await (prisma as any).user.findUnique({ where: { id: userId } });
        if (!user) return;

        const newScore = (user.gamificationScore || 0) + amount;
        const newLevel = this.calculateLevel(newScore);

        await (prisma as any).user.update({
            where: { id: userId },
            data: {
                gamificationScore: newScore,
                gamificationLevel: newLevel
            }
        });
    }

    static calculateLevel(xp: number): number {
        // Simple formula: Level = sqrt(XP / 100)
        return Math.floor(Math.sqrt(xp / 100)) + 1;
    }

    private static async checkAchievements(userId: string, activity: GamificationActivity) {
        // Filter achievements relevant to this activity category
        let category = '';
        if (activity === GamificationActivity.CALL_MADE) category = 'CALLS';
        if (activity === GamificationActivity.DEAL_WON) category = 'DEALS';

        if (!category) return;

        // Get all achievements in this category that the user DOES NOT have yet
        // Get all achievements in this category that the user DOES NOT have yet
        const potentialAchievements = await (prisma as any).achievement.findMany({
            where: {
                category: category,
                userAchievements: {
                    none: { userId: userId }
                }
            }
        });

        if (potentialAchievements.length === 0) return;

        // Calculate current stats for the user
        // TODO: This should be optimized. Aggregating on every event is costly.
        // Better approach: Store "stats" in User or a separate table.
        // For V1, we aggregate.
        let currentCount = 0;

        if (category === 'CALLS') {
            currentCount = await (prisma as any).call.count({ where: { userId } });
        } else if (category === 'DEALS') {
            // Assuming Deal = Lead with status VALIDATED/WON (need to check logic)
            // For now, let's assume we pass the count or check leads
            // currentCount = await prisma.lead.count({ where: { assignedToId: userId, status: 'WON' } });
            // Placeholder for now
            currentCount = 0;
        }

        // Check if any threshold is met
        for (const ach of potentialAchievements) {
            if (currentCount >= ach.threshold) {
                await this.unlockAchievement(userId, ach);
            }
        }
    }

    private static async unlockAchievement(userId: string, achievement: Achievement) {
        console.log(`🏆 [Gamification] User ${userId} unlocked: ${achievement.name}`);

        await (prisma as any).userAchievement.create({
            data: {
                userId,
                achievementId: achievement.id
            }
        });

        // Award bonus points for achievement
        if (achievement.points > 0) {
            await this.awardXP(userId, achievement.points);
        }
    }

    static async getLeaderboard(organisationId: string, limit: number = 10) {
        return await (prisma as any).user.findMany({
            where: {
                accessGrants: {
                    some: { organisationId: organisationId }
                }
            },
            orderBy: {
                gamificationScore: 'desc'
            },
            take: limit,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                image: true,
                gamificationScore: true,
                gamificationLevel: true,
                achievements: {
                    include: { achievement: true }
                },
                _count: {
                    select: { calls: true } // metrics
                }
            }
        });
    }
}
