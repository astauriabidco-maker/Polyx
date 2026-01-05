
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const trainings = await prisma.training.findMany();
    console.log(JSON.stringify(trainings, null, 2));
}

main().catch(console.error);
