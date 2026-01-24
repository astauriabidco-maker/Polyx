
import { prisma } from '../src/lib/prisma';
import { createAssessmentSessionAction, getAssessmentSessionAction, submitAssessmentAction } from '../src/application/actions/assessment.actions';
import { CefrLevel } from '@prisma/client';

async function main() {
    console.log("🧪 Starting Assessment Verification...");

    // 0. Get Valid Org
    const org = await prisma.organisation.findFirst();
    if (!org) throw new Error("No Organisation found to attach Lead");
    console.log(`✅ Using Organisation: ${org.name} (${org.id})`);

    // 1. Create a Test Lead
    const lead = await prisma.lead.create({
        data: {
            firstName: "Jean",
            lastName: "Testeur",
            email: `jean.testeur.${Date.now()}@example.com`,
            phone: "0600000000",
            source: "SCRIPT",
            status: "PROSPECT",
            organisationId: org.id,
            score: 50,
            callAttempts: 0
        }
    });
    console.log(`✅ Lead created: ${lead.id}`);

    // 2. Create Session
    const createRes = await createAssessmentSessionAction(lead.id, CefrLevel.B2);
    if (!createRes.success || !createRes.data) throw new Error("Failed to create session");
    const token = createRes.data.token;
    console.log(`✅ Session created with token: ${token}`);

    // 3. Get Questions (Simulate Frontend)
    const getRes = await getAssessmentSessionAction(token);
    if (!getRes.success || !getRes.data) throw new Error("Failed to get session");
    const questions = getRes.data.questions;
    console.log(`✅ Fetched ${questions.length} questions`);

    if (questions.length === 0) {
        console.warn("⚠️ No questions found! Did you run seed-assessment.ts?");
    }

    // 4. Answer Questions (Randomly)
    // We need real IDs. The 'questions' array has IDs.
    // We also need correct indexes to simulate a score. 
    // But getAssessmentSessionAction sanitizes correctIndex.
    // So we will just answer random indices 0-3.
    const answers: Record<string, number> = {};
    for (const q of questions) {
        answers[q.id] = Math.floor(Math.random() * 4);
    }

    // 5. Submit
    const submitRes = await submitAssessmentAction(token, answers);
    if (!submitRes.success || !submitRes.data) throw new Error(`Failed to submit: ${submitRes.error}`);
    const result = submitRes.data;

    console.log("✅ Assessment Submitted!");
    console.log(`   - Level: ${result.resultLevel}`);
    console.log(`   - Score: ${result.score}%`);
    console.log(`   - Gap Hours: ${result.recommendedHours}`);
    console.log(`   - Recommendation: ${result.recommendation}`);

    // 6. Verify Persistence
    const dbSession = await prisma.assessmentSession.findUnique({ where: { token } });
    if (dbSession?.status !== 'COMPLETED') throw new Error("Session status not COMPLETED");
    if (!dbSession.recommendation) throw new Error("Recommendation NOT saved");

    console.log("🎉 Verification Success: Flow is robust.");
}

// Helper to find an Org if needed
async function getOrg() {
    return await prisma.organisation.findFirst();
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
