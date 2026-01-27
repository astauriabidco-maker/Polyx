import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// HELPER DATA
// ============================================
const firstNames = ['Pierre', 'Paul', 'Jacques', 'Marie', 'Sophie', 'Julie', 'Thomas', 'Nicolas', 'Julien', 'Camille', 'Lucas', 'Léa', 'Emma', 'Chloé', 'Manon', 'Alex', 'Antoine', 'Sarah', 'Laura', 'Kevin', 'Jean', 'Claire', 'Marc', 'Isabelle', 'François'];
const lastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Dupont', 'Mercier', 'Blanc', 'Guerin', 'Faure'];
const cities = ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Lille', 'Toulouse', 'Nantes', 'Strasbourg', 'Montpellier', 'Rennes', 'Nice', 'Grenoble', 'Rouen', 'Toulon', 'Clermont-Ferrand'];
const sources = ['FACEBOOK', 'GOOGLE_ADS', 'WEBSITE', 'IMPORT', 'TERRAIN', 'LINKEDIN', 'INSTAGRAM', 'PARTENAIRE'];
const campaignTypes = ['ADS', 'EMAIL', 'PARTNER', 'EVENT'];
const campaignStatuses = ['ACTIVE', 'PAUSED', 'COMPLETED'];

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack: number, daysForward: number = 0): Date {
    const now = Date.now();
    const msBack = daysBack * 24 * 60 * 60 * 1000;
    const msForward = daysForward * 24 * 60 * 60 * 1000;
    return new Date(now - msBack + Math.random() * (msBack + msForward));
}

async function main() {
    console.log('🌱 Starting FULL Module Seeding...\n');

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
            status: 'ACTIVE',
        },
    });
    console.log(`🏢 Organization ensured: ${org.name}\n`);

    // 2. Ensure a User for assignments
    let testUser = await prisma.user.findFirst({ where: { email: 'demo@polyx.fr' } });
    if (!testUser) {
        testUser = await prisma.user.create({
            data: {
                email: 'demo@polyx.fr',
                name: 'Démo Commercial',
                firstName: 'Démo',
                lastName: 'Commercial',
                isActive: true,
            }
        });
        console.log(`👤 Created test user: ${testUser.email}`);
    } else {
        console.log(`👤 Using existing user: ${testUser.email}`);
    }

    // 3. Create Role if not exists
    let role = await prisma.role.findFirst({ where: { organisationId: org.id, name: 'Commercial' } });
    if (!role) {
        role = await prisma.role.create({
            data: {
                name: 'Commercial',
                organisationId: org.id,
            }
        });
        console.log(`🔑 Created role: ${role.name}`);
    }

    // 4. Link user to org
    const existingGrant = await prisma.userAccessGrant.findFirst({
        where: { userId: testUser.id, organisationId: org.id }
    });
    if (!existingGrant) {
        await prisma.userAccessGrant.create({
            data: {
                userId: testUser.id,
                organisationId: org.id,
                roleId: role.id,
                isActive: true,
            }
        });
        console.log(`🔗 Linked user to organisation`);
    }

    // ==========================================
    // MARKETING CAMPAIGNS (10)
    // ==========================================
    console.log('\n📣 Seeding Marketing Campaigns...');
    const campaignNames = [
        'Campagne CPF Été 2026',
        'Acquisition Langues Q1',
        'Partenariat Pole Emploi',
        'Social Media Boost',
        'Google Ads Performance',
        'Retargeting Facebook',
        'Email Nurturing Pro',
        'Webinar Anglais Business',
        'Challenge Instagram',
        'LinkedIn B2B Décideurs'
    ];

    const campaigns: any[] = [];
    for (const name of campaignNames) {
        const existing = await prisma.marketingCampaign.findFirst({
            where: { organisationId: org.id, name }
        });
        if (!existing) {
            const campaign = await prisma.marketingCampaign.create({
                data: {
                    organisationId: org.id,
                    name,
                    description: `Campagne marketing: ${name}`,
                    type: randomFrom(campaignTypes),
                    status: randomFrom(campaignStatuses),
                    budget: randomInt(500, 10000),
                    spent: randomInt(100, 5000),
                    startDate: randomDate(60, 0),
                    endDate: randomDate(0, 90),
                }
            });
            campaigns.push(campaign);
        } else {
            campaigns.push(existing);
        }
    }
    console.log(`✅ ${campaigns.length} Marketing Campaigns ready.`);

    // ==========================================
    // NURTURING SEQUENCES (5)
    // ==========================================
    console.log('\n🔄 Seeding Nurturing Sequences...');
    const sequenceNames = [
        'Séquence Bienvenue CPF',
        'Relance Prospects Froids',
        'Suivi Post-RDV',
        'Activation Langues',
        'Réengagement Inactifs'
    ];

    const sequences: any[] = [];
    for (const name of sequenceNames) {
        const existing = await prisma.nurturingSequence.findFirst({
            where: { organisationId: org.id, name }
        });
        if (!existing) {
            const seq = await prisma.nurturingSequence.create({
                data: {
                    organisationId: org.id,
                    name,
                    description: `Séquence automatisée: ${name}`,
                    isActive: true,
                    steps: {
                        create: [
                            { order: 1, type: 'SMS', channel: 'WHATSAPP', delayInHours: 0, content: `Bonjour ! Bienvenue dans notre parcours ${name}. 🎯` },
                            { order: 2, type: 'SMS', channel: 'WHATSAPP', delayInHours: 24, content: `Avez-vous pu consulter nos offres de formation ?` },
                            { order: 3, type: 'EMAIL', channel: 'EMAIL', delayInHours: 72, subject: 'Votre projet de formation', content: `Nous restons disponibles pour vous accompagner dans votre projet.` },
                        ]
                    }
                }
            });
            sequences.push(seq);
        } else {
            sequences.push(existing);
        }
    }
    console.log(`✅ ${sequences.length} Nurturing Sequences ready.`);

    // ==========================================
    // LEADS (150) - Various stages
    // ==========================================
    console.log('\n👥 Seeding Leads (CRM)...');
    const leadStatuses = ['PROSPECT', 'PROSPECTION', 'ATTEMPTED', 'CONTACTED', 'RDV_FIXE', 'QUALIFIED', 'EN_ATTENTE'];
    const salesStages = ['NOUVEAU', 'PROSPECTION', 'RDV_FIXE', 'QUALIFICATION', 'CLOSING', null];

    let leadsCreated = 0;
    for (let i = 0; i < 150; i++) {
        const fName = randomFrom(firstNames);
        const lName = randomFrom(lastNames);
        const email = `${fName.toLowerCase()}.${lName.toLowerCase()}.${i}@test-polyx.fr`;

        const existing = await prisma.lead.findFirst({ where: { email } });
        if (!existing) {
            const status = randomFrom(leadStatuses);
            const campaign = randomFrom(campaigns);

            await prisma.lead.create({
                data: {
                    organisationId: org.id,
                    firstName: fName,
                    lastName: lName,
                    email,
                    phone: `06${randomInt(10000000, 99999999)}`,
                    city: randomFrom(cities),
                    status,
                    salesStage: randomFrom(salesStages),
                    score: randomInt(20, 100),
                    source: randomFrom(sources),
                    campaignId: campaign.id,
                    assignedUserId: Math.random() > 0.3 ? testUser.id : null,
                    callAttempts: randomInt(0, 5),
                    responseDate: randomDate(30, 0),
                    nextCallbackAt: status === 'RDV_FIXE' ? randomDate(0, 7) : null,
                    notes: Math.random() > 0.5 ? `Note automatique pour ${fName}` : null,
                }
            });
            leadsCreated++;
        }
    }
    console.log(`✅ ${leadsCreated} new Leads created.`);

    // ==========================================
    // TRAININGS (10)
    // ==========================================
    console.log('\n📚 Seeding Trainings (Academy)...');
    const trainingData = [
        { title: 'Anglais Professionnel B1-B2', code: 'ANG-PRO-B1B2', durationHours: 60, priceHt: 2400, category: 'Langues', level: 'INTERMEDIATE' },
        { title: 'Anglais Débutant A1-A2', code: 'ANG-DEB-A1A2', durationHours: 80, priceHt: 3200, category: 'Langues', level: 'BEGINNER' },
        { title: 'Français Langue Étrangère', code: 'FLE-INT', durationHours: 100, priceHt: 4000, category: 'Langues', level: 'INTERMEDIATE' },
        { title: 'Excel Avancé', code: 'EXCEL-ADV', durationHours: 21, priceHt: 1050, category: 'Bureautique', level: 'ADVANCED' },
        { title: 'Gestion de Projet', code: 'PM-INIT', durationHours: 35, priceHt: 1750, category: 'Management', level: 'INTERMEDIATE' },
        { title: 'Marketing Digital', code: 'MKTG-DIG', durationHours: 28, priceHt: 1400, category: 'Marketing', level: 'INTERMEDIATE' },
        { title: 'Vente et Négociation', code: 'VENTE-NEG', durationHours: 14, priceHt: 700, category: 'Commercial', level: 'INTERMEDIATE' },
        { title: 'Python pour Data Science', code: 'PY-DATA', durationHours: 42, priceHt: 2100, category: 'Développement', level: 'ADVANCED' },
        { title: 'Espagnol Intermédiaire', code: 'ESP-INT', durationHours: 60, priceHt: 2400, category: 'Langues', level: 'INTERMEDIATE' },
        { title: 'Communication Professionnelle', code: 'COM-PRO', durationHours: 14, priceHt: 700, category: 'Soft Skills', level: 'BEGINNER' },
    ];

    const trainings: any[] = [];
    for (const t of trainingData) {
        const existing = await prisma.training.findFirst({
            where: { organisationId: org.id, code: t.code }
        });
        if (!existing) {
            const training = await prisma.training.create({
                data: {
                    organisationId: org.id,
                    title: t.title,
                    code: t.code,
                    description: `Formation certifiante: ${t.title}`,
                    durationHours: t.durationHours,
                    priceHt: t.priceHt,
                    category: t.category,
                    level: t.level,
                    isActive: true,
                }
            });
            trainings.push(training);
        } else {
            trainings.push(existing);
        }
    }
    console.log(`✅ ${trainings.length} Trainings ready.`);

    // ==========================================
    // LEARNERS (50) - Apprenants
    // ==========================================
    console.log('\n🎓 Seeding Learners (Apprenants)...');
    const fundingTypes = ['CPF', 'PERSO', 'OPCO', 'POLE_EMPLOI'];
    const learnerStatuses = ['ONBOARDING', 'IN_TRAINING', 'COMPLETED'];

    let learnersCreated = 0;
    for (let i = 0; i < 50; i++) {
        const fName = randomFrom(firstNames);
        const lName = randomFrom(lastNames);
        const email = `apprenant.${fName.toLowerCase()}.${lName.toLowerCase()}.${i}@test-polyx.fr`;

        const existing = await prisma.learner.findFirst({ where: { email } });
        if (!existing) {
            const learner = await prisma.learner.create({
                data: {
                    organisationId: org.id,
                    firstName: fName,
                    lastName: lName,
                    email,
                    phone: `07${randomInt(10000000, 99999999)}`,
                    city: randomFrom(cities),
                    gender: Math.random() > 0.5 ? 'M' : 'F',
                    birthDate: new Date(randomInt(1970, 2000), randomInt(0, 11), randomInt(1, 28)),
                    nationality: 'Française',
                    nativeLanguage: 'Français',
                }
            });

            // Create a folder for each learner
            const training = randomFrom(trainings);
            await prisma.learnerFolder.create({
                data: {
                    learnerId: learner.id,
                    trainingId: training.id,
                    fundingType: randomFrom(fundingTypes),
                    status: randomFrom(learnerStatuses),
                    complianceStatus: 'VALID',
                    trainingAmount: training.priceHt,
                    trainingTitle: training.title,
                    trainingDuration: training.durationHours,
                    hoursUsed: randomInt(0, training.durationHours),
                    officialStartDate: randomDate(90, 0),
                    officialEndDate: randomDate(0, 180),
                }
            });

            learnersCreated++;
        }
    }
    console.log(`✅ ${learnersCreated} new Learners with folders created.`);

    // ==========================================
    // CALENDAR EVENTS (30) - Agenda
    // ==========================================
    console.log('\n📅 Seeding Calendar Events (Agenda)...');
    const eventTypes = ['MEETING', 'CALL', 'INTERNAL', 'SESSION'];
    const eventStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];
    const eventTitles = [
        'RDV Découverte',
        'Suivi Pédagogique',
        'Appel Commercial',
        'Réunion Interne',
        'Session Formation',
        'Point Hebdo',
        'RDV Inscription CPF',
        'Entretien Candidat',
        'Présentation Offres',
        'Bilan Mi-Parcours'
    ];

    // Get some leads to link events to
    const leadsForEvents = await prisma.lead.findMany({
        where: { organisationId: org.id },
        take: 20
    });

    let eventsCreated = 0;
    for (let i = 0; i < 30; i++) {
        const startDate = randomDate(7, 14); // Past week to 2 weeks ahead
        const endDate = new Date(startDate.getTime() + randomInt(30, 120) * 60 * 1000); // 30-120 min duration

        const lead = leadsForEvents.length > 0 ? randomFrom(leadsForEvents) : null;

        await prisma.calendarEvent.create({
            data: {
                organisationId: org.id,
                userId: testUser.id,
                leadId: lead?.id || null,
                title: randomFrom(eventTitles),
                description: `Événement planifié automatiquement #${i + 1}`,
                start: startDate,
                end: endDate,
                type: randomFrom(eventTypes),
                status: startDate < new Date() ? randomFrom(['COMPLETED', 'CANCELLED', 'NO_SHOW']) : 'SCHEDULED',
            }
        });
        eventsCreated++;
    }
    console.log(`✅ ${eventsCreated} Calendar Events created.`);

    // ==========================================
    // LEAD ACTIVITIES (100) - CRM History
    // ==========================================
    console.log('\n📝 Seeding Lead Activities (CRM History)...');
    const activityTypes = ['NOTE', 'CALL', 'EMAIL', 'STATUS_CHANGE', 'MEETING', 'CREATED'];

    const leadsForActivities = await prisma.lead.findMany({
        where: { organisationId: org.id },
        take: 50
    });

    let activitiesCreated = 0;
    for (const lead of leadsForActivities) {
        const numActivities = randomInt(1, 5);
        for (let j = 0; j < numActivities; j++) {
            const type = randomFrom(activityTypes);
            let content = '';
            switch (type) {
                case 'NOTE': content = `Note ajoutée: Prospect intéressé par nos formations.`; break;
                case 'CALL': content = `Appel sortant - Durée: ${randomInt(1, 15)} min`; break;
                case 'EMAIL': content = `Email de relance envoyé`; break;
                case 'STATUS_CHANGE': content = `Statut modifié vers ${randomFrom(leadStatuses)}`; break;
                case 'MEETING': content = `RDV planifié`; break;
                case 'CREATED': content = `Lead créé via ${randomFrom(sources)}`; break;
            }

            await prisma.leadActivity.create({
                data: {
                    leadId: lead.id,
                    userId: testUser.id,
                    type,
                    content,
                    createdAt: randomDate(30, 0),
                }
            });
            activitiesCreated++;
        }
    }
    console.log(`✅ ${activitiesCreated} Lead Activities created.`);

    // ==========================================
    // CALLS (50) - Call Tracking
    // ==========================================
    console.log('\n📞 Seeding Calls...');
    const callOutcomes = ['ANSWERED', 'NO_ANSWER', 'BUSY', 'VOICEMAIL', 'WRONG_NUMBER'];

    let callsCreated = 0;
    for (let i = 0; i < 50; i++) {
        const lead = randomFrom(leadsForActivities);
        if (lead) {
            await prisma.call.create({
                data: {
                    leadId: lead.id,
                    callerId: testUser.id,
                    duration: randomInt(30, 600), // 30s to 10min
                    outcome: randomFrom(callOutcomes),
                    notes: Math.random() > 0.5 ? `Appel #${i + 1} - Notes de suivi` : null,
                    callbackAt: Math.random() > 0.7 ? randomDate(1, 7) : null,
                    createdAt: randomDate(14, 0),
                }
            });
            callsCreated++;
        }
    }
    console.log(`✅ ${callsCreated} Calls created.`);

    console.log('\n🎉 === SEEDING COMPLETE! ===\n');
    console.log('Summary:');
    console.log(`  📣 Marketing Campaigns: ${campaigns.length}`);
    console.log(`  🔄 Nurturing Sequences: ${sequences.length}`);
    console.log(`  👥 Leads: ${leadsCreated} new`);
    console.log(`  📚 Trainings: ${trainings.length}`);
    console.log(`  🎓 Learners: ${learnersCreated} new`);
    console.log(`  📅 Calendar Events: ${eventsCreated}`);
    console.log(`  📝 Lead Activities: ${activitiesCreated}`);
    console.log(`  📞 Calls: ${callsCreated}`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
