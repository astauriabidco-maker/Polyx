'use client';

import { useAuthStore } from '@/application/store/auth-store';
import IntelligentAgenda from '@/components/dashboard/IntelligentAgenda';
import { Loader2 } from 'lucide-react';

export default function AgendaPage() {
    const { user, activeOrganization, isLoading } = useAuthStore();

    if (isLoading || !activeOrganization || !user) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
                <p className="text-slate-400 font-medium">Chargement de l'Agenda...</p>
            </div>
        );
    }

    // For now, use a placeholder agencyId; in a real scenario, this would be the user's primary agency
    const agencyId = ''; // Could be fetched from user.agencies[0]?.agencyId

    return (
        <main className="p-8 space-y-8 animate-in fade-in duration-500">
            <IntelligentAgenda orgId={activeOrganization.id} agencyId={agencyId} />
        </main>
    );
}
