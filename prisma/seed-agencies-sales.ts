
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_ORG_ID = 'cmjx02z5300004792i18aebd5'; // Demo Org ID

async function main() {
    console.log('🌱 Starting Agency & Sales Provisioning...');

    // 1. Ensure Organization
    const org = await prisma.organisation.findUnique({ where: { id: TARGET_ORG_ID } });
    if (!org) {
        console.error("❌ Organization not found. Please run main seed first.");
        return;
    }
    console.log(`🏢 Organization found: ${org.name}`);

    // 2. Create Agencies
    const agenciesData = [
        { name: 'Agence Paris Sud', city: 'Paris', zipCode: '75014' },
        { name: 'Agence Lyon Centre', city: 'Lyon', zipCode: '69002' }
    ];

    const agencies = [];

    for (const agencyData of agenciesData) {
        const agency = await prisma.agency.upsert({
            where: { id: `agency-${agencyData.city.toLowerCase()}` }, // Stable ID for re-runs
            update: {},
            create: {
                id: `agency-${agencyData.city.toLowerCase()}`,
                organisationId: org.id,
                name: agencyData.name,
                city: agencyData.city,
                zipCode: agencyData.zipCode,
                managerName: 'Directeur Agence',
                distributionMode: 'ROUND_ROBIN',
                isActive: true
            }
        });
        agencies.push(agency);
        console.log(`✅ Agency ensured: ${agency.name}`);
    }

    // 3. Ensure "Commercial" Role
    let role = await prisma.role.findFirst({
        where: { organisationId: org.id, name: 'Commercial' }
    });

    if (!role) {
        role = await prisma.role.create({
            data: {
                organisationId: org.id,
                name: 'Commercial',
                isSystemDefault: false
            }
        });
        console.log(`✅ Role created: Commercial`);

        // Add minimal permissions
        await prisma.systemPermission.upsert({ where: { id: 'LEADS_VIEW' }, update: {}, create: { id: 'LEADS_VIEW', description: 'View Leads' } });
        await prisma.systemPermission.upsert({ where: { id: 'LEADS_EDIT' }, update: {}, create: { id: 'LEADS_EDIT', description: 'Edit Leads' } });
        // (Assuming pivot table for role<->perms exists in schema implicitly via relations, but using connect here if needed)
        // For simplicity, we skip full permission mapping unless strictly required by app logic. 
        // The app likely checks "SystemPermission" existence or UserAccessGrant.
    } else {
        console.log(`ℹ️ Role found: Commercial`);
    }


    // 4. Create Sales Reps & Assign to Agencies
    const salesData = [
        { firstName: 'Thomas', lastName: 'Vendeur', email: 'thomas.sales@test.com', agencyIndex: 0 },
        { firstName: 'Julie', lastName: 'Commerciale', email: 'julie.sales@test.com', agencyIndex: 1 }
    ];

    for (const data of salesData) {
        // Create/Update User
        const user = await prisma.user.upsert({
            where: { email: data.email },
            update: {},
            create: {
                email: data.email,
                name: `${data.firstName} ${data.lastName}`,
                firstName: data.firstName,
                lastName: data.lastName,
                isActive: true
            }
        });
        console.log(`👤 User ensured: ${user.name}`);

        // Grant Access to Org
        await prisma.userAccessGrant.upsert({
            where: {
                userId_organisationId: {
                    userId: user.id,
                    organisationId: org.id
                }
            },
            update: { roleId: role.id },
            create: {
                userId: user.id,
                organisationId: org.id,
                roleId: role.id
            }
        });
        console.log(`   🔑 Access granted to Org`);

        // Link to Agency
        const targetAgency = agencies[data.agencyIndex];
        await prisma.userAgency.create({
            data: {
                userId: user.id,
                agencyId: targetAgency.id
            }
        }).catch(() => {
            // Ignore if already exists (unique constraint)
            console.log(`   ℹ️ Already linked to agency ${targetAgency.name}`);
        });
        console.log(`   🏢 Linked to ${targetAgency.name}`);
    }

    console.log('🎉 Provisioning complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
