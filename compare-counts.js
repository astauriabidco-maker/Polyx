
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const orgs = await prisma.organisation.findMany({
        include: {
            _count: { select: { learners: true, leads: true } }
        }
    });

    console.log('Comparison:');
    orgs.forEach(o => {
        console.log(`- ${o.name} (ID: ${o.id})`);
        console.log(`  Leads: ${o._count.leads} | Learners: ${o._count.learners}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
