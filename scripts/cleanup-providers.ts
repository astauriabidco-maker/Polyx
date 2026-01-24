
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Clearing ApiProvider table...');
    try {
        // Try using the model if it exists in the client
        // @ts-ignore
        await prisma.apiProvider.deleteMany({});
        console.log('Successfully deleted all ApiProviders.');
    } catch (error) {
        console.log('Model access failed, trying raw SQL...');
        try {
            await prisma.$executeRawUnsafe('DELETE FROM api_providers;');
            console.log('Successfully deleted all ApiProviders via RAW SQL.');
        } catch (e) {
            console.error('Failed to cleanup:', e);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
