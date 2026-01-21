'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/security';

// ═══════════════════════════════════════════════════════════════
// SERVER-SIDE PERMISSION GUARD
// ═══════════════════════════════════════════════════════════════

export interface AuthContext {
    userId: string;
    email: string;
    isGlobalAdmin: boolean;
    organisationId: string | null;
    permissions: string[];
}

/**
 * Get the current user's authentication context from token
 * Returns null if not authenticated
 */
export async function getAuthContext(): Promise<AuthContext | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) return null;

        const payload = await verifyToken(token);
        if (!payload) return null;

        // Get user's first active access grant with permissions
        const accessGrant = await prisma.userAccessGrant.findFirst({
            where: { userId: payload.userId, isActive: true },
            include: {
                role: {
                    include: { permissions: true }
                }
            }
        });

        // Build permission list from role
        const permissions = accessGrant?.role.permissions.map(p => p.id) || [];

        return {
            userId: payload.userId,
            email: payload.email,
            isGlobalAdmin: payload.isGlobalAdmin,
            organisationId: accessGrant?.organisationId || null,
            permissions
        };
    } catch (error) {
        console.error('[ServerGuard] Error getting auth context:', error);
        return null;
    }
}

/**
 * Check if user has a specific permission
 * @param requiredPermission - Permission ID (e.g., 'LEADS_VIEW')
 * @returns true if user has permission or is global admin
 */
export async function hasPermission(requiredPermission: string): Promise<boolean> {
    const ctx = await getAuthContext();
    if (!ctx) return false;

    // Global admins have all permissions
    if (ctx.isGlobalAdmin) return true;

    return ctx.permissions.includes(requiredPermission);
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(permissions: string[]): Promise<boolean> {
    const ctx = await getAuthContext();
    if (!ctx) return false;
    if (ctx.isGlobalAdmin) return true;

    return permissions.some(p => ctx.permissions.includes(p));
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(permissions: string[]): Promise<boolean> {
    const ctx = await getAuthContext();
    if (!ctx) return false;
    if (ctx.isGlobalAdmin) return true;

    return permissions.every(p => ctx.permissions.includes(p));
}

/**
 * Guard function that throws if user doesn't have permission
 * Use in Server Actions to protect sensitive operations
 */
export async function requirePermission(permission: string): Promise<AuthContext> {
    const ctx = await getAuthContext();

    if (!ctx) {
        throw new Error('Non authentifié');
    }

    if (!ctx.isGlobalAdmin && !ctx.permissions.includes(permission)) {
        throw new Error(`Permission refusée: ${permission} requis`);
    }

    return ctx;
}

/**
 * Guard that ensures user is authenticated (no permission check)
 */
export async function requireAuth(): Promise<AuthContext> {
    const ctx = await getAuthContext();

    if (!ctx) {
        throw new Error('Non authentifié');
    }

    return ctx;
}

/**
 * Guard that ensures user is a global admin
 */
export async function requireGlobalAdmin(): Promise<AuthContext> {
    const ctx = await getAuthContext();

    if (!ctx) {
        throw new Error('Non authentifié');
    }

    if (!ctx.isGlobalAdmin) {
        throw new Error('Accès réservé aux administrateurs globaux');
    }

    return ctx;
}
