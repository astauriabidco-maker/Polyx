
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const orgId = 'cmjx02z5300004792i18aebd5';

    const trainings = [
        {
            organisationId: orgId,
            title: 'Pack Préparation TOEIC (30h)',
            code: 'ENG-TOEIC-30',
            description: 'Pack intensif pour préparer le TOEIC Listening & Reading.',
            durationHours: 30,
            priceHt: 1490,
            level: 'INTERMEDIATE',
            category: 'Anglais',
            examId: '1' // TOEIC-LR
        },
        {
            organisationId: orgId,
            title: 'Pack Coaching TOEFL (20h)',
            code: 'ENG-TOEFL-20',
            description: 'Coaching individuel pour réussir le TOEFL iBT.',
            durationHours: 20,
            priceHt: 1190,
            level: 'ADVANCED',
            category: 'Anglais',
            examId: '3' // TOEFL
        },
        {
            organisationId: orgId,
            title: 'Formation Excel Expert (15h)',
            code: 'OFF-EXCEL-EXP',
            description: 'Maîtrisez les macros et les TCD.',
            durationHours: 15,
            priceHt: 890,
            level: 'EXPERT',
            category: 'Bureautique',
            examId: null
        }
    ];

    for (const t of trainings) {
        await prisma.training.create({ data: t });
    }

    console.log('Trainings seeded successfully');
}

main().catch(console.error);
