
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking Lead Priority Criteria...');

    // 1. Fetch all non-archived leads
    const leads = await prisma.lead.findMany({
        where: {
            status: { notIn: ['ARCHIVED', 'DISQUALIFIED', 'RDV_FIXE'] }
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            score: true,
            status: true,
            salesStage: true,
            source: true
        },
        take: 20
    });

    console.log(`Found ${leads.length} potential leads.`);
    console.log('------------------------------------------------');
    console.log('ID | Name | Score | Status | Stage | Source | Is Priority?');
    console.log('------------------------------------------------');

    let priorityCount = 0;

    for (const lead of leads) {
        // Priority Criteria from LeadService
        const isHighScore = lead.score > 75;
        const isValidStatus = ['PROSPECT', 'PROSPECTION', 'ATTEMPTED'].includes(lead.status);
        const isNotCrm = lead.salesStage !== 'NOUVEAU';

        const isPriority = isHighScore && isValidStatus && isNotCrm;
        if (isPriority) priorityCount++;

        console.log(
            `${lead.firstName} ${lead.lastName}`.padEnd(20) +
            ` | ${lead.score}`.padEnd(8) +
            ` | ${lead.status}`.padEnd(12) +
            ` | ${lead.salesStage || 'N/A'}`.padEnd(10) +
            ` | ${lead.source || 'N/A'}`.padEnd(10) +
            ` | ${isPriority ? '✅ YES' : '❌ NO'}`
        );

        if (!isPriority) {
            const reasons = [];
            if (!isHighScore) reasons.push(`Score too low (${lead.score} <= 75)`);
            if (!isValidStatus) reasons.push(`Status ${lead.status} not allowed`);
            if (!isNotCrm) reasons.push(`Stage is NOUVEAU (CRM)`);
            console.log(`   -> Fail Reason: ${reasons.join(', ')}`);
        }
    }

    console.log('------------------------------------------------');
    console.log(`Total Priority Leads: ${priorityCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
