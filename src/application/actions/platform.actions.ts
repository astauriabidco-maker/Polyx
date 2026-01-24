'use server';

import { PrismaClient } from '@prisma/client';
import { checkIsGlobalAdminAction } from './auth.actions';
import { revalidatePath } from 'next/cache';

export interface PlatformConfigData {
    id: string;
    platformName: string;
    description: string | null;
    logoUrl: string | null;
    faviconUrl: string | null;
    footerText: string | null;
    legalName: string | null;
    legalAddress: string | null;
    supportEmail: string | null;
}

/**
 * Get the singleton platform config.
 * Uses RAW SQL to bypass cached Prisma Client issues.
 */
export async function getPlatformConfigAction() {
    const prisma = new PrismaClient();
    try {
        console.log("[PlatformConfig] Fetching config via RAW SQL");

        // RAW SQL SELECT for SQLite
        const result: any[] = await prisma.$queryRaw`SELECT * FROM platform_config WHERE id = 'default' LIMIT 1`;

        console.log("[PlatformConfig] Raw result:", result);

        let config = result[0];

        if (!config) {
            console.log("[PlatformConfig] No setup found, creating default via RAW SQL...");
            const now = new Date().toISOString();

            await prisma.$executeRaw`
                INSERT INTO platform_config (id, platformName, footerText, updatedAt)
                VALUES ('default', 'Polyx', 'Powered by Polyx', ${now})
            `;

            // Re-fetch
            const newRes: any[] = await prisma.$queryRaw`SELECT * FROM platform_config WHERE id = 'default' LIMIT 1`;
            config = newRes[0];
            console.log("[PlatformConfig] Created default config:", config);
        }

        return { success: true, data: JSON.parse(JSON.stringify(config)) };
    } catch (error) {
        console.error("[PlatformConfig] FATAL ERROR:", error);
        return { success: false, error: "Erreur (Raw): " + (error instanceof Error ? error.message : String(error)) };
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Update platform config.
 * Global Admin only.
 */
export async function updatePlatformConfigAction(data: Partial<PlatformConfigData>) {
    const prisma = new PrismaClient();
    try {
        const isGlobalAdmin = await checkIsGlobalAdminAction();
        if (!isGlobalAdmin) {
            return { success: false, error: "Non autorisé" };
        }

        const now = new Date().toISOString();
        const id = 'default';
        const platformName = data.platformName || 'Polyx';
        const description = data.description || null;
        const footerText = data.footerText || null;
        const legalName = data.legalName || null;
        const legalAddress = data.legalAddress || null;
        const supportEmail = data.supportEmail || null;
        const logoUrl = data.logoUrl || null;
        const faviconUrl = data.faviconUrl || null;

        // SQLite Upsert using INSERT OR REPLACE is tricky if we want to preserve other fields, 
        // but since this is a comprehensive update form, we can use UPDATE or INSERT.
        // Let's try standard UPDATE first, knowing existence is likely due to getPlatformConfigAction calling first.

        // 1. Try Update
        const updateCount = await prisma.$executeRaw`
            UPDATE platform_config 
            SET platformName = ${platformName},
                description = ${description},
                footerText = ${footerText},
                legalName = ${legalName},
                legalAddress = ${legalAddress},
                supportEmail = ${supportEmail},
                logoUrl = ${logoUrl},
                faviconUrl = ${faviconUrl},
                updatedAt = ${now}
            WHERE id = ${id}
        `;

        if (updateCount === 0) {
            // 2. Insert if not exists
            await prisma.$executeRaw`
                INSERT INTO platform_config (
                    id, platformName, description, footerText, 
                    legalName, legalAddress, supportEmail, 
                    logoUrl, faviconUrl, updatedAt
                ) VALUES (
                    ${id}, ${platformName}, ${description}, ${footerText},
                    ${legalName}, ${legalAddress}, ${supportEmail},
                    ${logoUrl}, ${faviconUrl}, ${now}
                )
            `;
        }

        // Fetch back
        const res: any[] = await prisma.$queryRaw`SELECT * FROM platform_config WHERE id = 'default' LIMIT 1`;
        const config = res[0];

        revalidatePath('/app/app/layout'); // Revalidate global layout
        return { success: true, data: JSON.parse(JSON.stringify(config)) };
    } catch (error) {
        console.error("Failed to update platform config:", error);
        return { success: false, error: "Erreur lors de la sauvegarde (Raw)" };
    } finally {
        await prisma.$disconnect();
    }
}
