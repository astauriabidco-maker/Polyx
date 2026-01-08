
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACHIEVEMENTS = [
    {
        slug: 'first-call',
        name: 'Première Voix',
        description: 'Effectuer votre premier appel de prospection',
        icon: 'Phone',
        points: 50,
        category: 'CALLS',
        threshold: 1
    },
    {
        slug: '100-calls',
        name: 'Marathonien',
        description: 'Effectuer 100 appels au total',
        icon: 'Trophy',
        points: 500,
        category: 'CALLS',
        threshold: 100
    },
    {
        slug: 'first-deal',
        name: 'Closer',
        description: 'Signer votre première vente',
        icon: 'CheckCircle',
        points: 1000,
        category: 'DEALS',
        threshold: 1
    },
    {
        slug: 'high-response-rate',
        name: 'Charisme',
        description: 'Obtenir un taux de réponse > 30% sur 50 appels',
        icon: 'Star',
        points: 300,
        category: 'QUALITY',
        threshold: 30
    }
];

async function main() {
    console.log('🌱 Seeding Gamification Achievements...');

    for (const ach of ACHIEVEMENTS) {
        await prisma.achievement.upsert({
            where: { slug: ach.slug },
            update: ach,
            create: ach
        });
    }

    console.log('✅ Gamification seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
