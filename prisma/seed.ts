
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Seeding...');

    // 1. Ensure Organization
    const TARGET_ORG_ID = 'cmjx02z5300004792i18aebd5'; // User's active Org
    const org = await prisma.organisation.upsert({
        where: { id: TARGET_ORG_ID },
        update: {},
        create: {
            id: TARGET_ORG_ID,
            name: 'Polyx Demo Academy',
            siret: '12345678901234',
            isActive: true,
            // Settings might not be in schema
        },
    });

    console.log(`🏢 Organization ensured: ${org.name}`);

    // 3. Create Leads in various stages
    const NOW = new Date();

    // ==========================================
    // BULK GENERATION (100 LEADS)
    // 50 PROSPCTS (Cold) / 50 RDV_FIXE (Hot)
    // ==========================================

    const firstNames = ['Pierre', 'Paul', 'Jacques', 'Marie', 'Sophie', 'Julie', 'Thomas', 'Nicolas', 'Julien', 'Camille', 'Lucas', 'Léa', 'Emma', 'Chloé', 'Manon', 'Alex', 'Antoine', 'Sarah', 'Laura', 'Kevin'];
    const lastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier'];
    const cities = ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Lille', 'Toulouse', 'Nantes', 'Strasbourg', 'Montpellier', 'Rennes'];
    const sources = ['FACEBOOK', 'GOOGLE_ADS', 'WEBSITE', 'IMPORT', 'TERRAIN', 'LINKEDIN'];

    const leadsToCreate = [];

    // 1. GENERATE 50 COLD LEADS (PROSPECT)
    for (let i = 0; i < 50; i++) {
        const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
        leadsToCreate.push({
            firstName: fName,
            lastName: `${lName}`,
            email: `${fName.toLowerCase()}.${lName.toLowerCase()}.${i}@test.com`,
            phone: `06${Math.floor(Math.random() * 90000000 + 10000000)}`,
            city: cities[Math.floor(Math.random() * cities.length)],
            status: 'PROSPECT',
            salesStage: undefined, // Or 'NOUVEAU' if purely cold import
            source: sources[Math.floor(Math.random() * sources.length)],
            // COLD: > 60 days old (e.g. 60 to 150 days ago)
            responseDate: new Date(Date.now() - (60 * 24 * 60 * 60 * 1000) - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000))
        });
    }

    // 2. GENERATE 50 HOT LEADS (RDV_FIXE)
    for (let i = 0; i < 50; i++) {
        const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const isHonored = Math.random() > 0.5; // Past RDV can be honored or missed

        leadsToCreate.push({
            firstName: fName,
            lastName: `${lName}`,
            email: `${fName.toLowerCase()}.${lName.toLowerCase()}.rdv.${i}@test.com`,
            phone: `07${Math.floor(Math.random() * 90000000 + 10000000)}`,
            city: cities[Math.floor(Math.random() * cities.length)],

            status: 'RDV_FIXE',
            salesStage: 'RDV_FIXE',
            source: 'WEBSITE',

            responseDate: new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000)), // 0-5 days ago
            nextCallbackAt: new Date(Date.now() - Math.floor(Math.random() * 48 * 60 * 60 * 1000)), // RDV was 0-48h ago

            closingData: {} // Empty initial closing data
        });
    }

    for (const l of leadsToCreate) {
        // Find existing
        const existing = await prisma.lead.findFirst({ where: { email: l.email } });

        const payload: any = {
            organisationId: org.id,
            firstName: l.firstName,
            lastName: l.lastName,
            email: l.email,
            phone: l.phone,
            status: l.status,
            salesStage: l.salesStage,
            responseDate: l.responseDate || new Date(),
            nextCallbackAt: (l as any).nextCallbackAt,
            closingData: l.closingData || {}, // Json
            source: l.source,
            city: (l as any).city || 'Paris',
            callAttempts: 0
        };

        if (existing) {
            await prisma.lead.update({
                where: { id: existing.id },
                data: {
                    organisationId: org.id, // FORCE UPDATE ORG
                    status: l.status,
                    salesStage: l.salesStage,
                    closingData: l.closingData || {},
                }
            });
        } else {
            await prisma.lead.create({
                data: payload
            });
        }
    }

    console.log(`✅ Seeded ${leadsToCreate.length} Leads.`);
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
