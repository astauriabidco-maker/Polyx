'use client';

import { Suspense, useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, MapPin, DollarSign, LayoutDashboard, Settings2, Network, ClipboardCheck } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

// Import exploitation components
import FranchisesSettingsPage from '../settings/franchises/page';
import StructureSettingsPage from '../settings/structure/page';
import BillingManagementPage from '../settings/billing/page';
import ExamManagementPage from './exams/page';

export default function NetworkExploitationPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'franchises');

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        router.push(`/app/network?tab=${value}`);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-100">
                        <Network size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">Pilotage Réseau</h1>
                        <p className="text-sm text-slate-500">Gérez l'expansion de votre réseau, la performance de vos franchises et la facturation.</p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-8">
                    <TabsList className="bg-slate-100/80 p-1 rounded-xl w-fit border border-slate-200/50 flex flex-wrap h-auto">
                        <TabsTrigger value="franchises" className="rounded-lg px-6 py-2 content-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Building size={16} />
                            <span className="font-bold text-xs uppercase tracking-wider text-nowrap">Gestion Franchises</span>
                        </TabsTrigger>
                        <TabsTrigger value="agencies" className="rounded-lg px-6 py-2 content-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <MapPin size={16} />
                            <span className="font-bold text-xs uppercase tracking-wider text-nowrap">Agences & Points de Vente</span>
                        </TabsTrigger>
                        <TabsTrigger value="billing" className="rounded-lg px-6 py-2 content-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <DollarSign size={16} />
                            <span className="font-bold text-xs uppercase tracking-wider text-nowrap">Redevances & Facturation</span>
                        </TabsTrigger>
                        <TabsTrigger value="exams" className="rounded-lg px-6 py-2 content-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <ClipboardCheck size={16} />
                            <span className="font-bold text-xs uppercase tracking-wider text-nowrap">Sessions d'Examen</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-4 md:p-8">
                <Tabs value={activeTab}>
                    <TabsContent value="franchises" className="mt-0 ring-offset-0 focus-visible:ring-0">
                        <FranchisesSettingsPage />
                    </TabsContent>

                    <TabsContent value="agencies" className="mt-0 ring-offset-0 focus-visible:ring-0">
                        <StructureSettingsPage />
                    </TabsContent>

                    <TabsContent value="billing" className="mt-0 ring-offset-0 focus-visible:ring-0">
                        <BillingManagementPage />
                    </TabsContent>

                    <TabsContent value="exams" className="mt-0 ring-offset-0 focus-visible:ring-0">
                        <ExamManagementPage />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
