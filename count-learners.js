
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const orgs = await prisma.organisation.findMany({
        include: { _count: { select: { learners: true } } }
    });

    console.log('Organizations and Learner Counts:');
    orgs.forEach(o => {
        console.log(`- ${o.name} (ID: ${o.id}) | Learners: ${o._count.learners}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
