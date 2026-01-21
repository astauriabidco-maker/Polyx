
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Boosting Lead Scores for Priority Queue...');

    // 1. Find 3 leads that are eligible for priority status but have low score
    const leads = await prisma.lead.findMany({
        where: {
            status: { in: ['PROSPECT', 'PROSPECTION'] },
            score: { lt: 75 },
            salesStage: null // Not in CRM
        },
        take: 3
    });

    if (leads.length === 0) {
        console.log('⚠️ No eligible leads found to boost.');
        return;
    }

    const adminUser = await prisma.user.findFirst();
    const userId = adminUser?.id || 'system';

    // 2. Update them to score 85 (High Priority)
    for (const lead of leads) {
        // Update Score
        await prisma.lead.update({
            where: { id: lead.id },
            data: { score: 85 }
        });

        // Add Activity Log
        await prisma.leadActivity.create({
            data: {
                leadId: lead.id,
                type: 'NOTE',
                content: "Score boosté par le système pour démo Priority Queue",
                userId: userId
            }
        });

        console.log(`✅ Boosted ${lead.firstName} ${lead.lastName} (Score: 50 -> 85)`);
    }

    console.log('🎉 Boost complete! Refreshed priority queue.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
