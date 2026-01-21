'use client';

import { useAuthStore } from '@/application/store/auth-store';
import FormateurManagement from '@/components/admin/FormateurManagement';
import { Loader2 } from 'lucide-react';

export default function FormateurPage() {
    const { activeOrganization, isLoading } = useAuthStore();

    if (isLoading || !activeOrganization) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="animate-spin text-purple-600" size={40} />
                <p className="text-slate-400 font-medium">Chargement du module Formateur...</p>
            </div>
        );
    }

    return (
        <main className="p-8 space-y-8 animate-in fade-in duration-500">
            <FormateurManagement orgId={activeOrganization.id} />
        </main>
    );
}
