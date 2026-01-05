
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Diagnosing Learners Data...");

    const learners = await prisma.learner.findMany({
        include: { organisation: true }
    });

    console.log(`Found ${learners.length} learners.`);

    learners.forEach(l => {
        console.log(`- ${l.firstName} ${l.lastName} (Org: ${l.organisation.name}, ID: ${l.organisationId})`);
    });

    const orgs = await prisma.organisation.findMany();
    console.log("\nAvailable Organisations:");
    orgs.forEach(o => console.log(`- ${o.name} (${o.id})`));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
