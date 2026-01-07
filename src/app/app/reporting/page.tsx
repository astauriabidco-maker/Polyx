'use client';

import { Suspense } from 'react';
import StrategicCockpit from '@/components/dashboard/StrategicCockpit';
import { useAuthStore } from '@/application/store/auth-store';
import { Card } from '@/components/ui/card';

export default function ReportingPage() {
    const { activeOrganization } = useAuthStore();
    const orgId = activeOrganization?.id || "org_28yNqfS3";

    return (
        <main className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-sm font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">
                        Direction Générale
                    </h1>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight italic leading-none">
                        Reporting Stratégique
                    </h2>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button className="px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-bold text-slate-900">Mensuel</button>
                    <button className="px-4 py-2 text-sm font-bold text-slate-500">Trimestriel</button>
                    <button className="px-4 py-2 text-sm font-bold text-slate-500">Annuel</button>
                </div>
            </div>

            <Suspense fallback={<LoadingState />}>
                <StrategicCockpit orgId={orgId} />
            </Suspense>
        </main>
    );
}

function LoadingState() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
            <Card className="h-[400px] bg-slate-50" />
            <Card className="h-[400px] bg-slate-50" />
            <Card className="h-[250px] bg-slate-50" />
            <Card className="h-[250px] bg-slate-50" />
        </div>
    );
}
