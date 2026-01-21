
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Diagnostic Started');

    // 1. List all Organisations
    const orgs = await prisma.organisation.findMany({ select: { id: true, name: true } });
    console.log('\n🏢 Organisations:', orgs);

    // 2. List all Users and their Grants
    const users = await prisma.user.findMany({
        include: {
            accessGrants: true
        }
    });
    console.log('\n👤 Users found:', users.length);
    console.log('Sample Users:', users.map(u => ({ id: u.id, name: u.name, grants: u.accessGrants.map(g => g.organisationId) })).slice(0, 10));

    // 3. Check specific Sales Reps
    const sales = await prisma.user.findMany({
        where: { email: { in: ['thomas.sales@test.com', 'julie.sales@test.com'] } },
        include: { accessGrants: true }
    });
    console.log('\n💼 Provisioned Sales Reps:', sales.map(s => ({
        name: s.name,
        email: s.email,
        orgAccess: s.accessGrants.map(g => g.organisationId)
    })));

    // 4. Check Leads and their Orgs
    const leads = await prisma.lead.findMany({ take: 5, select: { id: true, firstName: true, organisationId: true } });
    console.log('\n📋 Sample Leads:', leads);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
