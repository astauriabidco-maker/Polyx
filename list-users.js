
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        include: { accessGrants: { include: { organisation: true } } }
    });

    users.forEach(u => {
        console.log(`- User: ${u.email}`);
        u.accessGrants.forEach(g => {
            console.log(`  - Org: ${g.organisation.name} (ID: ${g.organisation.id})`);
        });
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
