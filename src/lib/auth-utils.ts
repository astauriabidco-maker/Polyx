import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { getUserOrgAccess } from './permissions';

export async function getCurrentUserId() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token || !token.startsWith('mock_token_')) {
        return null;
    }

    return token.replace('mock_token_', '');
}

/**
 * Check if user has access to a specific agency, considering franchise hierarchy.
 * 
 * Access logic:
 * - Admin/Directeur: Full access to all agencies in the org
 * - Franchise user: Access to all agencies of their assigned franchises
 * - Agency user: Access only to their directly assigned agencies
 */
export async function checkAgencyAccess(organisationId: string, agencyId?: string) {
    const userId = await getCurrentUserId();
    if (!userId) {
        return { success: false, error: "Non authentifié", isAllowed: false };
    }

    const accesses = await getUserOrgAccess(userId);
    const currentAccess = accesses.find(a => a.organisationId === organisationId);

    if (!currentAccess) {
        return { success: false, error: "Accès refusé à cette organisation", isAllowed: false };
    }

    const roleName = currentAccess.role.toUpperCase();
    const isFullAdmin = roleName.includes('ADMIN') || roleName.includes('DIRECTEUR');

    // If no agencyId specified, we just need to know if they belong to the org
    if (!agencyId) {
        return { success: true, isAllowed: true, isFullAdmin };
    }

    // If full admin, they have access to everything in the org
    if (isFullAdmin) {
        return { success: true, isAllowed: true, isFullAdmin, assignedAgencyIds: [], assignedFranchiseIds: [] };
    }

    // Step 1: Get user's assigned franchises
    const userFranchises = await (prisma as any).userFranchise.findMany({
        where: { userId },
        select: { franchiseId: true }
    });
    const assignedFranchiseIds = userFranchises.map((uf: any) => uf.franchiseId);

    // Step 2: Get all agencies belonging to user's franchises
    let franchiseAgencyIds: string[] = [];
    if (assignedFranchiseIds.length > 0) {
        const franchiseAgencies = await (prisma as any).agency.findMany({
            where: {
                organisationId,
                franchiseId: { in: assignedFranchiseIds }
            },
            select: { id: true }
        });
        franchiseAgencyIds = franchiseAgencies.map((a: any) => a.id);
    }

    // Step 3: Get user's directly assigned agencies
    const userAgencies = await (prisma as any).userAgency.findMany({
        where: { userId, agency: { organisationId } },
        select: { agencyId: true }
    });
    const directAgencyIds = userAgencies.map((ua: any) => ua.agencyId);

    // Combine both sources of agency access
    const allAssignedAgencyIds = [...new Set([...franchiseAgencyIds, ...directAgencyIds])];
    const isAllowed = allAssignedAgencyIds.includes(agencyId);

    return {
        success: true,
        isAllowed,
        isFullAdmin,
        assignedAgencyIds: allAssignedAgencyIds,
        assignedFranchiseIds
    };
}

/**
 * Returns a prisma where clause for agency filtering based on user permissions.
 * Includes franchise-based access.
 */
export async function getAgencyWhereClause(organisationId: string, requestedAgencyId?: string) {
    const access = await checkAgencyAccess(organisationId, requestedAgencyId);

    if (!access.success || (!access.isAllowed && requestedAgencyId)) {
        throw new Error(access.error || "Accès refusé à l'agence demandée");
    }

    const where: any = { organisationId };

    if (requestedAgencyId) {
        // Explicit request for one agency
        where.agencyId = requestedAgencyId;
    } else if (!access.isFullAdmin) {
        // Restricted user viewing "all" -> filter by their assigned agencies (from franchises + direct)
        if (access.assignedAgencyIds && access.assignedAgencyIds.length > 0) {
            where.agencyId = { in: access.assignedAgencyIds };
        } else {
            // No agencies assigned = empty results
            where.agencyId = { in: [] };
        }
    }

    return where;
}

/**
 * Get accessible franchise IDs for the current user
 */
export async function getUserAccessibleFranchises(organisationId: string) {
    const userId = await getCurrentUserId();
    if (!userId) return { isAdmin: false, franchiseIds: [] };

    const accesses = await getUserOrgAccess(userId);
    const currentAccess = accesses.find(a => a.organisationId === organisationId);

    if (!currentAccess) return { isAdmin: false, franchiseIds: [] };

    const roleName = currentAccess.role.toUpperCase();
    const isAdmin = roleName.includes('ADMIN') || roleName.includes('DIRECTEUR');

    if (isAdmin) {
        // Admin sees all franchises
        const allFranchises = await (prisma as any).franchise.findMany({
            where: { organisationId },
            select: { id: true }
        });
        return { isAdmin: true, franchiseIds: allFranchises.map((f: any) => f.id) };
    }

    // Get user's assigned franchises
    const userFranchises = await (prisma as any).userFranchise.findMany({
        where: { userId },
        include: { franchise: { select: { organisationId: true } } }
    });

    // Filter to only franchises in the current org
    const franchiseIds = userFranchises
        .filter((uf: any) => uf.franchise.organisationId === organisationId)
        .map((uf: any) => uf.franchiseId);

    return { isAdmin: false, franchiseIds };
}
