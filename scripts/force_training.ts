
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const learner = await prisma.learner.findFirst();
    if (!learner) {
        console.log("No learner found");
        return;
    }

    const folder = await prisma.learnerFolder.findFirst({
        where: { learnerId: learner.id }
    });

    if (folder) {
        await prisma.learnerFolder.update({
            where: { id: folder.id },
            data: {
                status: 'IN_TRAINING',
                trainingDuration: 100
            }
        }); // Force status
        console.log(`Updated learner ${learner.firstName} to IN_TRAINING`);
    } else {
        console.log("No folder found");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
