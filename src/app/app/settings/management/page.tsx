'use client';

import { Suspense, useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, MapPin, ShieldCheck, Settings2, Globe, Building } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

// Import existing page contents as components
import OrganizationProfilePage from '../organization/page';
import StructureSettingsPage from '../structure/page';
import FranchisesSettingsPage from '../franchises/page';
import UsersPage from '../users/page';
import RolesPage from '../roles/page';

export default function NetworkManagementPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'identity');

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        router.push(`/app/settings/management?tab=${value}`);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <Settings2 size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestion du Réseau</h1>
                        <p className="text-sm text-slate-500">Pilotez votre structure, vos agences et vos collaborateurs depuis un espace centralisé.</p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-8">
                    <TabsList className="bg-slate-100/80 p-1 rounded-xl w-fit border border-slate-200/50 flex flex-wrap h-auto">
                        <TabsTrigger value="identity" className="rounded-lg px-6 py-2 content-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Building2 size={16} />
                            <span className="font-bold text-xs uppercase tracking-wider text-nowrap">Identité OF</span>
                        </TabsTrigger>
                        <TabsTrigger value="franchises" className="rounded-lg px-6 py-2 content-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Building size={16} />
                            <span className="font-bold text-xs uppercase tracking-wider text-nowrap">Franchises</span>
                        </TabsTrigger>
                        <TabsTrigger value="structure" className="rounded-lg px-6 py-2 content-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <MapPin size={16} />
                            <span className="font-bold text-xs uppercase tracking-wider text-nowrap">Agences (Points de Vente)</span>
                        </TabsTrigger>
                        <TabsTrigger value="team" className="rounded-lg px-6 py-2 content-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Users size={16} />
                            <span className="font-bold text-xs uppercase tracking-wider text-nowrap">Équipe & Utilisateurs</span>
                        </TabsTrigger>
                        <TabsTrigger value="roles" className="rounded-lg px-6 py-2 content-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <ShieldCheck size={16} />
                            <span className="font-bold text-xs uppercase tracking-wider text-nowrap">Habilitations (Rôles)</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-4 md:p-8">
                <Tabs value={activeTab}>
                    <TabsContent value="identity" className="mt-0 ring-offset-0 focus-visible:ring-0">
                        <OrganizationProfilePage />
                    </TabsContent>

                    <TabsContent value="franchises" className="mt-0 ring-offset-0 focus-visible:ring-0">
                        <FranchisesSettingsPage />
                    </TabsContent>

                    <TabsContent value="structure" className="mt-0 ring-offset-0 focus-visible:ring-0">
                        <StructureSettingsPage />
                    </TabsContent>

                    <TabsContent value="team" className="mt-0 ring-offset-0 focus-visible:ring-0">
                        <UsersPage />
                    </TabsContent>

                    <TabsContent value="roles" className="mt-0 ring-offset-0 focus-visible:ring-0">
                        <RolesPage />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
