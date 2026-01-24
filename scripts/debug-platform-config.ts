
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing PlatformConfig access...');

    try {
        console.log('1. Attempting to find unique default...');
        const config = await prisma.platformConfig.findUnique({
            where: { id: 'default' }
        });
        console.log('Found config:', config);

        if (!config) {
            console.log('2. Attempting to create default...');
            const newConfig = await prisma.platformConfig.create({
                data: {
                    id: 'default',
                    platformName: 'Polyx Debug',
                    footerText: 'Powered by Polyx Debug'
                }
            });
            console.log('Created config:', newConfig);
        }
    } catch (e: any) {
        console.error('ERROR:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
