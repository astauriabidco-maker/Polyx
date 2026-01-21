const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Multi-touch Attribution Seeder ---');

    // Find a lead to test with
    const lead = await prisma.lead.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (!lead) {
        console.log('No lead found. Please create a lead first.');
        return;
    }

    console.log(`Adding touchpoints for lead: ${lead.firstName} ${lead.lastName} (${lead.id})`);

    // Clean existing touchpoints for this lead for clean test
    await prisma.leadTouchpoint.deleteMany({
        where: { leadId: lead.id }
    });

    // Inject a journey
    const touchpoints = [
        {
            leadId: lead.id,
            type: 'AD_CLICK',
            source: 'facebook',
            medium: 'social',
            campaign: 'remarketing_q1',
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        },
        {
            leadId: lead.id,
            type: 'PAGE_VIEW',
            source: 'google',
            medium: 'organic',
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        },
        {
            leadId: lead.id,
            type: 'CHAT_INTERACTION',
            source: 'direct',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
            leadId: lead.id,
            type: 'LEAD_GENERATION',
            source: 'google_ads',
            medium: 'cpc',
            campaign: 'brand_search',
            createdAt: new Date() // Now
        }
    ];

    for (const tp of touchpoints) {
        await prisma.leadTouchpoint.create({ data: tp });
    }

    console.log('✅ Journey injected successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
