
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Verifying Prisma Relation...');
    try {
        const leads = await prisma.lead.findMany({
            take: 1,
            include: { provider: true }
        });
        console.log('✅ Success! Leads found:', leads.length);
        if (leads.length > 0) {
            console.log('Sample Lead Provider:', leads[0].provider);
        }
    } catch (error) {
        console.error('❌ Error testing relation:', error);
        process.exit(1);
    }
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
