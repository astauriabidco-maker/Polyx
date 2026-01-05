import prisma from './prisma';
import { getUserOrgAccess } from './permissions';

async function testPermissions() {
    console.log('🧪 Testing User Organization Access & Permissions...');

    // 1. Fetch a user from the seeded database
    const user = await prisma.user.findFirst({
        where: { email: 'sales.lyon@polyx.com' } // Marie Lyon, has access to Lyon and Paris
    });

    if (!user) {
        console.error('❌ User not found. Did you run prisma db seed?');
        return;
    }

    console.log(`\n👤 User: ${user.name} (${user.email})`);

    // 2. Get Access DTO
    const access = await getUserOrgAccess(user.id);

    console.log(`\n🏢 Found ${access.length} organizations:`);

    access.forEach((org) => {
        console.log(`\n--- Organization: ${org.organisationName} ---`);
        console.log(`Role: ${org.role}`);
        console.log(`Permissions:`, org.computedPermissions);
        console.log(`Turnover (CA): ${org.turnover !== null ? org.turnover.toLocaleString() + '€' : 'ACCESS DENIED'}`);
    });

    // 3. Test with Admin
    const admin = await prisma.user.findFirst({
        where: { email: 'admin@polyx.com' }
    });

    if (admin) {
        const adminAccess = await getUserOrgAccess(admin.id);
        console.log(`\n\n👤 User: ${admin.name} (Admin)`);
        adminAccess.forEach((org) => {
            console.log(`\n--- Organization: ${org.organisationName} ---`);
            console.log(`Role: ${org.role}`);
            console.log(`Turnover (CA): ${org.turnover !== null ? org.turnover.toLocaleString() + '€' : 'ACCESS DENIED'}`);
        });
    }
}

testPermissions()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
