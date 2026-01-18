const { prisma } = require('../src/lib/prisma');

async function seed() {
    const org = await prisma.organisation.findFirst();
    if (!org) return console.log('Aucune organisation trouvée');

    let lead = await prisma.lead.findFirst({
        where: { firstName: 'Jean', lastName: 'Dupont' }
    });

    if (!lead) {
        lead = await prisma.lead.create({
            data: {
                firstName: 'Jean',
                lastName: 'Dupont',
                email: 'jean.dupont@test.com',
                phone: '+33612345678',
                source: 'Facebook Ads',
                status: 'RDV_FIXE',
                salesStage: 'NOUVEAU',
                organisationId: org.id
            }
        });
        console.log('✅ Lead Jean Dupont créé.');
    } else {
        console.log('Lead Jean Dupont déjà présent.');
    }

    // Ajouter des touchpoints
    const touchpoints = [
        {
            leadId: lead.id,
            type: 'AD_CLICK',
            source: 'Facebook Ads',
            medium: 'social',
            campaign: 'Promo Janvier 2026',
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        },
        {
            leadId: lead.id,
            type: 'PAGE_VIEW',
            source: 'Facebook',
            medium: 'referral',
            pageUrl: '/landing-page',
            createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
        },
        {
            leadId: lead.id,
            type: 'FORM_START',
            source: 'Direct',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
            leadId: lead.id,
            type: 'LEAD_GENERATION',
            source: 'Facebook Ads',
            medium: 'cpc',
            campaign: 'Promo Janvier 2026',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
    ];

    for (const tp of touchpoints) {
        await prisma.leadTouchpoint.create({ data: tp });
    }

    console.log('✅ 4 touchpoints ajoutés pour Jean Dupont.');
}

seed().catch(console.error);
