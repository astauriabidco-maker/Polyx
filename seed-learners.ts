
import { PrismaClient } from '@prisma/client';
import { ComplianceEngine } from './src/application/services/compliance-engine';
import { FundingType } from './src/domain/entities/learner';

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding Learners...");

    // 1. Get ALL Organizations
    const orgs = await prisma.organisation.findMany();
    if (orgs.length === 0) {
        console.error("❌ No organization found. Please seed an organization first.");
        return;
    }
    console.log(`Found ${orgs.length} organisations. Seeding for all...`);

    // 2. Data to seed
    const learnersToCreate = [
        {
            firstName: "Thomas",
            lastName: "Anderson",
            email: "neo@matrix.com",
            fundingType: FundingType.CPF,
            status: "ONBOARDING"
        },
        {
            firstName: "Sarah",
            lastName: "Connor",
            email: "sarah.connor@skynet.net",
            fundingType: FundingType.PERSO,
            status: "IN_TRAINING"
        },
        {
            firstName: "Marty",
            lastName: "McFly",
            email: "marty@delorean.com",
            fundingType: FundingType.OPCO,
            status: "ONBOARDING"
        }
    ];

    for (const org of orgs) {
        console.log(`\n--- Seeding for Org: ${org.name} ---`);
        for (const data of learnersToCreate) {
            // Check if already exists to avoid dupes (optional but good)
            const exists = await prisma.learner.findFirst({
                where: { email: data.email, organisationId: org.id }
            });

            if (exists) {
                console.log(`Skipping ${data.firstName} (already exists)`);
                continue;
            }

            // Create Identity
            const learner = await prisma.learner.create({
                data: {
                    organisationId: org.id,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    phone: "0600000000"
                }
            });


            // Get Requirements (simulated API fetch)
            const requirements = ComplianceEngine.getRequirements(data.fundingType);

            // Simulate CPF Data from API
            let cpfData = {};
            if (data.fundingType === FundingType.CPF) {
                cpfData = {
                    externalFileId: "401479189837",
                    funderName: "CAISSE DE DÉPOT",
                    acceptanceDate: new Date("2026-01-03"),
                    trainingAmount: 2250.00,
                    trainingLocation: "PANTIN",
                    trainingDuration: 42,
                    remainingHours: 42,
                    weeklyIntensity: "10h",
                    startDate: new Date("2026-01-20"),
                    endDate: new Date("2026-07-20"),
                    convocationSent: false
                };
            }

            // Create Folder
            await prisma.learnerFolder.create({
                data: {
                    learnerId: learner.id,
                    fundingType: data.fundingType,
                    status: data.status,
                    complianceStatus: 'PENDING',
                    // Spread CPF Data
                    ...cpfData,
                    documents: {
                        create: requirements.map(req => ({
                            type: req.type,
                            label: req.label,
                            isRequired: req.required,
                            status: 'MISSING'
                        }))
                    }
                }
            });

            console.log(`✅ Created Learner: ${data.firstName} ${data.lastName} (${data.fundingType})`);
        }
    }

    console.log("✨ Seeding completed!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
