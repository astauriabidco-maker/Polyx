'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, MapPin, Network, Plus, Store } from 'lucide-react';
import { OrganizationTab } from './_components/OrganizationTab';
import { AgenciesTab } from './_components/AgenciesTab';
import { FranchisesTab } from './_components/FranchisesTab';
import { useAuthStore } from '@/application/store/auth-store';
import { Button } from '@/components/ui/button';

export default function StructurePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { activeOrganization } = useAuthStore();

    const currentTab = searchParams.get('tab') || 'organization';

    const handleTabChange = (val: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('tab', val);
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800">Structure & Réseau</h2>
                    <p className="text-sm text-slate-500">
                        Administration de l'organisme <span className="font-bold">{activeOrganization?.name}</span> et son maillage.
                    </p>
                </div>
            </div>

            <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList className="bg-slate-100 p-1">
                    <TabsTrigger value="organization" className="gap-2">
                        <Building2 size={16} /> Entité Juridique (OF)
                    </TabsTrigger>
                    <TabsTrigger value="agencies" className="gap-2">
                        <Store size={16} /> Agences & Sites
                    </TabsTrigger>
                    <TabsTrigger value="franchises" className="gap-2">
                        <Network size={16} /> Réseau Franchisé
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="organization" className="focus-visible:outline-none">
                    <OrganizationTab />
                </TabsContent>

                <TabsContent value="agencies" className="focus-visible:outline-none">
                    <AgenciesTab />
                </TabsContent>

                <TabsContent value="franchises" className="focus-visible:outline-none">
                    <FranchisesTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
