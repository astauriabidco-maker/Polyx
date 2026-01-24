
import { PrismaClient, CefrLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Assessment Module (Specific Grammar)...');

    // 1. Config Default (80h)
    // Check if exists or update
    const existingConfig = await prisma.assessmentConfig.findFirst();
    if (!existingConfig) {
        await prisma.assessmentConfig.create({
            data: {
                hoursPerLevel: 80,
                targetObjectives: [
                    { name: "Standard", target: "B2" }
                ]
            }
        });
        console.log('✅ Config created: 80h/level');
    }

    // 2. Clear old random questions if only test
    // For safety in dev, let's delete all mostly to ensure clean slate for this logic test
    await prisma.question.deleteMany({});

    // 3. Create Specific Grammar Questions (A1 & A2)
    const questionsData = [
        // A1 Questions
        {
            content: "Il ______ français.",
            level: CefrLevel.A1,
            choices: ["parle", "parles", "parlent", "parlons"],
            correctIndex: 0
        },
        {
            content: "Tu ______ où ?",
            level: CefrLevel.A1,
            choices: ["habite", "habites", "habitez", "habitons"],
            correctIndex: 1
        },
        {
            content: "C'est ______ livre.",
            level: CefrLevel.A1,
            choices: ["ma", "mon", "mes", "moi"],
            correctIndex: 1
        },
        {
            content: "J'ai ______ ans.",
            level: CefrLevel.A1,
            choices: ["vingt", "blanc", "grand", "beaucoup"],
            correctIndex: 0
        },
        {
            content: "Elle est ______.",
            level: CefrLevel.A1,
            choices: ["petit", "petite", "petits", "petites"],
            correctIndex: 1
        },
        // A2 Questions
        {
            content: "Hier, je ______ allé au cinéma.",
            level: CefrLevel.A2,
            choices: ["suis", "ai", "as", "est"],
            correctIndex: 0
        },
        {
            content: "Il faut que tu ______ tes devoirs.",
            level: CefrLevel.A2,
            choices: ["fais", "fasses", "fait", "faire"],
            correctIndex: 1
        },
        {
            content: "Si j'avais de l'argent, j'______ une voiture.",
            level: CefrLevel.A2,
            choices: ["achète", "achèterai", "achèterais", "acheté"],
            correctIndex: 2
        },
        {
            content: "C'est la maison ______ j'habite.",
            level: CefrLevel.A2,
            choices: ["que", "qui", "où", "dont"],
            correctIndex: 2
        },
        {
            content: "Il n'y a ______ dans la rue.",
            level: CefrLevel.A2,
            choices: ["personne", "rien", "jamais", "pas"],
            correctIndex: 0
        }
    ];

    for (const q of questionsData) {
        await prisma.question.create({
            data: {
                content: q.content,
                level: q.level,
                choices: q.choices,
                correctIndex: q.correctIndex,
                isActive: true
            }
        });
    }

    console.log(`✅ Seed complete: ${questionsData.length} grammar questions created.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
