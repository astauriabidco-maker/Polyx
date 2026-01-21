
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const orgs = await prisma.organisation.findMany();

    for (const org of orgs) {
        console.log(`Ensuring learners for ${org.name} (${org.id})...`);

        const learnersData = [
            { firstName: 'Thomas', lastName: 'Anderson', email: `thomas@matrix.com` },
            { firstName: 'Sarah', lastName: 'Connor', email: `sarah@sky.net` },
            { firstName: 'Marty', lastName: 'McFly', email: `marty@future.com` }
        ];

        for (const data of learnersData) {
            // Check if learner exists for this org
            let learner = await prisma.learner.findFirst({
                where: { email: data.email, organisationId: org.id }
            });

            if (!learner) {
                learner = await prisma.learner.create({
                    data: { ...data, organisationId: org.id }
                });
            }

            // Ensure folder exists
            const existingFolder = await prisma.learnerFolder.findFirst({
                where: { learnerId: learner.id }
            });

            if (!existingFolder) {
                await prisma.learnerFolder.create({
                    data: {
                        learnerId: learner.id,
                        fundingType: 'CPF',
                        status: 'ONBOARDING',
                        complianceStatus: 'PENDING',
                        trainingTitle: 'Formation Développeur Fullstack Next.js',
                        officialStartDate: new Date('2026-01-15'),
                        officialEndDate: new Date('2026-06-15'),
                        actualStartDate: new Date(),
                        trainingAmount: 1500,
                        cpfStatus: 'Accepté',
                        cpfProgressStatus: 'ACCEPTE'
                    }
                });
                console.log(`  - Created folder for ${data.firstName}`);
            } else {
                // Update to the new schema
                await prisma.learnerFolder.update({
                    where: { id: existingFolder.id },
                    data: {
                        officialStartDate: new Date('2026-01-15'),
                        officialEndDate: new Date('2026-06-15'),
                        actualStartDate: new Date(),
                        cpfProgressStatus: 'ACCEPTE'
                    }
                });
                console.log(`  - Updated folder for ${data.firstName}`);
            }
        }
    }
    console.log('Done.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
