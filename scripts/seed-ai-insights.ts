
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding AI Insights...');

    // 1. Get a few active leads (from existing organization)
    const leads = await prisma.lead.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { organisation: true }
    });

    if (leads.length === 0) {
        console.log('⚠️ No leads found. Please create some leads first.');
        return;
    }

    const adminUser = await prisma.user.findFirst({
        where: { email: { contains: '@' } } // Get any valid user
    });

    if (!adminUser) {
        console.log('⚠️ No user found to assign as caller.');
        return;
    }

    console.log(`Found ${leads.length} leads to enrich.`);

    // 2. Define mock scenarios
    const scenarios = [
        {
            sentiment: 'POSITIVE',
            notes: "Client très intéressé par la formation Data. A un budget CPF dispo.",
            analysis: {
                sentiment: 'POSITIVE',
                summary: "L'appel s'est très bien déroulé. Le prospect montre un fort intérêt pour la formation Data Analyst et a confirmé son éligibilité CPF.",
                objections: [],
                keyPoints: ["Budget CPF validé", "Intérêt Data Analyst", "Disponible mois prochain"],
                buyingSignals: ["Lien d'inscription demandé", "A posé des questions sur le planning"],
                analyzedAt: new Date().toISOString()
            }
        },
        {
            sentiment: 'NEGATIVE',
            notes: "Pas intéressé, trouve le prix trop élevé. A raccroché.",
            analysis: {
                sentiment: 'NEGATIVE',
                summary: "Le prospect a coupé court à la conversation en évoquant le coût de la formation.",
                objections: ["Prix trop élevé", "Pas de temps"],
                keyPoints: ["Raccroché rapidement", "Refus catégorique"],
                buyingSignals: [],
                analyzedAt: new Date().toISOString()
            }
        },
        {
            sentiment: 'NEUTRAL',
            notes: "Hésitant. Doit réfléchir et en parler à son conjoint.",
            analysis: {
                sentiment: 'NEUTRAL',
                summary: "Échange cordial mais sans engagement. Le prospect a besoin de temps de réflexion.",
                objections: ["Doit réfléchir", "Décision de couple"],
                keyPoints: ["Intérêt modéré", "Rappel prévu semaine prochaine"],
                buyingSignals: ["A demandé la brochure"],
                analyzedAt: new Date().toISOString()
            }
        },
        {
            sentiment: 'POSITIVE',
            notes: "Super contact ! Veut commencer lundi.",
            analysis: {
                sentiment: 'POSITIVE',
                summary: "Excellent fit. Prospect motivé et prêt à démarrer.",
                objections: [],
                keyPoints: ["Urgence de démarrage", "Motivation forte"],
                buyingSignals: ["Veut commencer lundi", "A demandé le contrat"],
                analyzedAt: new Date().toISOString()
            }
        }
    ];

    // 3. Create Calls with Analysis
    for (const [index, lead] of leads.entries()) {
        const scenario = scenarios[index % scenarios.length]; // Cycle through scenarios

        await prisma.call.create({
            data: {
                leadId: lead.id,
                callerId: adminUser.id,
                duration: 120 + Math.floor(Math.random() * 300), // Random duration
                outcome: 'ANSWERED',
                notes: scenario.notes,
                aiAnalysis: scenario.analysis as any, // Bypass type check specifically for seeding
                createdAt: new Date()
            }
        });

        console.log(`✅ Created ${scenario.sentiment} call for lead: ${lead.firstName} ${lead.lastName}`);
    }

    console.log('🎉 AI Insights seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
