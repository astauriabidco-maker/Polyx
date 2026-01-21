import { prisma } from '../src/lib/prisma';
import { NurturingService } from '../src/application/services/nurturing.service';

async function testNRP() {
    console.log('--- TEST NRP AUTOMATION ---');

    // 1. Find a test organization
    const org = await prisma.organisation.findFirst();
    if (!org) {
        console.error('No organization found');
        return;
    }
    console.log(`Using Org: ${org.name} (${org.id})`);

    // 2. Create a test lead
    const lead = await prisma.lead.create({
        data: {
            organisationId: org.id,
            firstName: 'Test',
            lastName: 'NRP',
            phone: '+33000000000',
            email: 'test-nrp@example.com',
            status: 'NEW'
        }
    });
    console.log(`Created Lead: ${lead.firstName} ${lead.lastName} (${lead.id})`);

    try {
        // 3. Trigger NRP Relance
        console.log('Triggering NRP Relance...');
        const enrollment = await NurturingService.triggerNrpRelance(lead.id, org.id);
        console.log(`Enrollment created: ${enrollment.id}`);

        // 4. Verify Sequence
        const sequence = await prisma.nurturingSequence.findFirst({
            where: { organisationId: org.id, name: "Relance NRP (Automatique)" },
            include: { steps: true }
        });

        if (sequence) {
            console.log(`SUCCESS: Sequence found with ${sequence.steps.length} steps`);
            sequence.steps.forEach(s => {
                console.log(` - Step ${s.order}: ${s.type} (${s.delayInHours}h)`);
            });
        } else {
            console.error('FAILURE: Sequence not found');
        }

        // 5. Verify Tasks
        const tasks = await prisma.nurturingTask.findMany({
            where: { enrollmentId: enrollment.id }
        });
        console.log(`SUCCESS: ${tasks.length} tasks scheduled for enrollment`);
        tasks.forEach(t => {
            console.log(` - Task: ${t.type} at ${t.scheduledAt.toISOString()} - Content: ${t.content.substring(0, 30)}...`);
        });

    } catch (error) {
        console.error('An error occurred during test:', error);
    } finally {
        // 6. Cleanup
        console.log('Cleaning up...');
        await prisma.nurturingTask.deleteMany({ where: { leadId: lead.id } });
        await prisma.nurturingEnrollment.deleteMany({ where: { leadId: lead.id } });
        await prisma.lead.delete({ where: { id: lead.id } });
        console.log('Cleanup done.');
    }
}

testNRP()
    .catch(err => console.error(err))
    .finally(() => prisma.$disconnect());
