'use client';

import { useAuthStore } from '@/application/store/auth-store';
import SalesCockpit from '@/components/dashboard/SalesCockpit';
import ManagerCockpit from '@/components/dashboard/ManagerCockpit';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
    const { user, activeOrganization, hasPermission, isLoading, isNexusMode, getActiveOrgIds } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user && activeOrganization) {
            // ... routing logic could go here if needed ...
        }
    }, [user, activeOrganization, isLoading]);

    if (isLoading || !activeOrganization || !user) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
                <p className="text-slate-400 font-medium">Initialisation du Cockpit...</p>
            </div>
        );
    }

    // --- SMART ROUTING LOGIC ---

    const currentMember = user.memberships?.find(m => m.organizationId === activeOrganization.id);
    const isLearnerRole = currentMember?.role === 'LEARNER' ||
        currentMember?.role === 'Apprenant' ||
        (currentMember?.role as any)?.id === 'LEARNER' ||
        (currentMember?.role as any)?.name === 'Apprenant';

    if (isLearnerRole) {
        router.push('/app/learner');
        return (
            <div className="h-full flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
                <p className="text-slate-400 font-medium">Redirection vers l'espace apprenant...</p>
            </div>
        );
    }

    const orgIds = getActiveOrgIds();

    // 1. Manager / Admin View
    if (hasPermission('canViewFinance') || hasPermission('canEditUsers')) {
        return <ManagerCockpit orgId={orgIds.length === 1 ? orgIds[0] : (orgIds as any)} />;
    }

    // 2. Sales / Formateur View
    return <SalesCockpit userId={user.id} orgId={orgIds.length === 1 ? orgIds[0] : (orgIds as any)} />;
}
