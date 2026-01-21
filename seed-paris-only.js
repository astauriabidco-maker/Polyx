
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const orgId = 'cmjx02z5300004792i18aebd5'; // Paris
    const org = await prisma.organisation.findUnique({ where: { id: orgId } });
    if (!org) {
        console.log('Paris org not found');
        return;
    }

    // Delete learners ONLY for this org to be safe
    await prisma.learner.deleteMany({ where: { organisationId: orgId } });

    const learners = [
        { firstName: 'Thomas', lastName: 'Anderson (Paris)', email: 'thomas.paris@matrix.com' },
        { firstName: 'Sarah', lastName: 'Connor (Paris)', email: 'sarah.paris@sky.net' },
        { firstName: 'Jean', lastName: 'Dujardin', email: 'jean.dujardin@film.fr' }
    ];

    for (const l of learners) {
        await prisma.learner.create({
            data: {
                ...l,
                organisationId: orgId,
                folders: {
                    create: {
                        fundingType: 'CPF',
                        status: 'ONBOARDING',
                        complianceStatus: 'VALID',
                        trainingTitle: 'Formation Parisienne',
                        officialStartDate: new Date(),
                        officialEndDate: new Date(),
                        actualStartDate: new Date(),
                        cpfProgressStatus: 'ACCEPTE',
                        cpfStatus: 'Accepté'
                    }
                }
            }
        });
    }
    console.log('Successfully seeded 3 learners for Paris Org');
}

main().catch(console.error).finally(() => prisma.$disconnect());
