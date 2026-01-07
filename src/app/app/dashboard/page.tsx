'use client';

import { useAuthStore } from '@/application/store/auth-store';
import SalesCockpit from '@/components/dashboard/SalesCockpit';
import ManagerCockpit from '@/components/dashboard/ManagerCockpit';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
    const { user, activeOrganization, hasPermission, isLoading } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user && activeOrganization) {
            // 0. Learner Redirection
            const isLearner = user.memberships.some(m =>
                m.organizationId === activeOrganization.id &&
                ((typeof m.role === 'string' ? m.role === 'LEARNER' || m.role === 'Apprenant' : (m.role as any).name === 'Apprenant'))
            );
            // simplified check: if NO permissions typical of staff?
            // Best to rely on a specific role check if available in store.
            // For now, let's assume if they have NO permissions, they might be learners? 
            // Or explicitly check if they are NOT staff.

            // Better: Let's assume the AuthStore provides roles. 
            // But for now, let's rely on the role name or a helper.
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

    // 0. Learner Check (Client-side redirect)
    // We do this here to avoid splash screen if possible, but inside effect is safer for router usage.
    // However, we can return the redirect component or just push.
    // If we simply use `window.location` or `router.push` inside the component body it might cause hydration issues.
    // Let's us a simple check:

    // Temporary: Check if user has "Apprenant" role in current org membership
    const currentMember = user.memberships.find(m => m.organizationId === activeOrganization.id);
    // Note: Role name might be "LEARNER" or "Apprenant".
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


    // 1. Manager / Admin View
    // Condition: Can view finances OR Edit Users (typical admin traits)
    if (hasPermission('canViewFinance') || hasPermission('canEditUsers')) {
        return <ManagerCockpit orgId={activeOrganization.id} />;
    }

    // 2. Sales / Formateur View
    // Default fallback for operational users
    return <SalesCockpit userId={user.id} orgId={activeOrganization.id} />;
}
