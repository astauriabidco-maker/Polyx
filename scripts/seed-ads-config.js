const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Ads Connector Setup ---');

    const org = await prisma.organisation.findFirst();
    if (!org) {
        console.log('No organization found.');
        return;
    }

    console.log(`Enabling Ads for: ${org.name} (${org.id})`);

    await prisma.integrationConfig.upsert({
        where: { organisationId: org.id },
        update: {
            metaAdsEnabled: true,
            metaAdsVerifyToken: 'polyx_verify',
            googleAdsEnabled: true,
            googleAdsWebhookSecret: 'test_google_secret'
        },
        create: {
            organisationId: org.id,
            metaAdsEnabled: true,
            metaAdsVerifyToken: 'polyx_verify',
            googleAdsEnabled: true,
            googleAdsWebhookSecret: 'test_google_secret'
        }
    });

    console.log('✅ Ads integration configured!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
