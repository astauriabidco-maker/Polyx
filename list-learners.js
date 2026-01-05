
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const learners = await prisma.learner.findMany({
        include: { folders: true, organisation: true }
    });

    console.log('Total learners found:', learners.length);
    learners.forEach(l => {
        console.log(`- Learner: ${l.firstName} ${l.lastName}`);
        console.log(`  Org: ${l.organisation?.name || 'NONE'} (ID: ${l.organisationId})`);
        l.folders.forEach(f => {
            console.log(`  - Folder ID: ${f.id} | Funding: ${f.fundingType}`);
        });
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
