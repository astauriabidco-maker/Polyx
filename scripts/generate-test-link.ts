
import { prisma } from '../src/lib/prisma';
import { createAssessmentSessionAction } from '../src/application/actions/assessment.actions';
import { CefrLevel } from '@prisma/client';

async function main() {
    console.log("🔗 Generating Test Link...");

    // 1. Find a Lead
    const lead = await prisma.lead.findFirst();
    if (!lead) {
        console.error("❌ No leads found. Please seed leads first.");
        return;
    }

    // 2. Create Session
    const res = await createAssessmentSessionAction(lead.id, CefrLevel.B1);

    if (res.success && res.data) {
        console.log(`\n✨ SUCCESS! Test Link Generated:\n`);
        console.log(`👉 http://localhost:5555/test/${res.data.token}`);
        console.log(`\n(Lead: ${lead.firstName} ${lead.lastName})`);
    } else {
        console.error("❌ Failed to create session");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
