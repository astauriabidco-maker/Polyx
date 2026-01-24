import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma_polyx_v2: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma_polyx_v2 ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma_polyx_v2 = prisma;

// Forced HMR update for Prisma Client (Schema Update)
export default prisma;
