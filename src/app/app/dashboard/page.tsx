'use client';

import { useAuthStore } from '@/application/store/auth-store';
import SalesCockpit from '@/components/dashboard/SalesCockpit';
import ManagerCockpit from '@/components/dashboard/ManagerCockpit';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
    const { user, activeOrganization, hasPermission, isLoading } = useAuthStore();

    if (isLoading || !activeOrganization || !user) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
                <p className="text-slate-400 font-medium">Initialisation du Cockpit...</p>
            </div>
        );
    }

    // --- SMART ROUTING LOGIC ---

    // 1. Manager / Admin View
    // Condition: Can view finances OR Edit Users (typical admin traits)
    if (hasPermission('canViewFinance') || hasPermission('canEditUsers')) {
        return <ManagerCockpit orgId={activeOrganization.id} />;
    }

    // 2. Sales / Formateur View
    // Default fallback for operational users
    return <SalesCockpit userId={user.id} orgId={activeOrganization.id} />;
}
