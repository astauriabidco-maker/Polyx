'use client';

import { useEffect, useState } from 'react';
import { getAssessmentsListAction } from '@/application/actions/assessment-dashboard.ts';
import { AssessmentTable } from '@/components/assessments/AssessmentTable';
import { KPICard } from '@/components/ui/kpi-card';
import { useAuthStore } from '@/application/store/auth-store';
import { FileText, Clock, BarChart, CheckCircle2 } from 'lucide-react';

export default function AssessmentDashboardPage() {
    const { user } = useAuthStore();
    const [data, setData] = useState<any>({ assessments: [], stats: { totalTests: 0, pendingCount: 0, completedCount: 0, potentialHours: 0 } });
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        if (!user?.organizationId) return;
        setIsLoading(true);
        const res = await getAssessmentsListAction(user.organizationId);
        if (res.success && res.data) {
            setData(res.data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (user?.organizationId) {
            fetchData();
        }
    }, [user?.organizationId]);

    if (!user) return null;

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Pilotage des Tests</h1>
                <p className="text-slate-500">Suivi des évaluations et du potentiel de formation.</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard
                    title="Total Tests"
                    value={data.stats.totalTests}
                    icon={FileText}
                    color="indigo"
                />
                <KPICard
                    title="En Attente"
                    value={data.stats.pendingCount}
                    icon={Clock}
                    color="orange"
                />
                <KPICard
                    title="Tests Terminés"
                    value={data.stats.completedCount}
                    icon={CheckCircle2}
                    color="green"
                />
                <KPICard
                    title="Potentiel Heures"
                    value={`${data.stats.potentialHours} h`}
                    icon={BarChart}
                    color="purple"
                />
            </div>

            {/* Table */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-800">Liste des Candidats</h2>
                </div>
                <AssessmentTable
                    initialData={data.assessments}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
}
