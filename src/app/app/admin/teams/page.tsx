'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UsersPage from '../users/page';
import RolesPage from '../roles/page';
import { Users, ShieldCheck } from 'lucide-react';

export default function TeamsPage() {
    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Équipes & Accès</h1>
                <p className="text-slate-500 font-medium">Gérez vos collaborateurs, leurs rôles et leurs permissions d'accès au système.</p>
            </div>

            <Tabs defaultValue="users" className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-xl">
                    <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm rounded-lg px-6 py-2 flex items-center gap-2">
                        <Users size={16} />
                        Utilisateurs
                    </TabsTrigger>
                    <TabsTrigger value="roles" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm rounded-lg px-6 py-2 flex items-center gap-2">
                        <ShieldCheck size={16} />
                        Rôles & Permissions
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="mt-0 border-none p-0 shadow-none bg-transparent">
                    <UsersPage hideHeader />
                </TabsContent>

                <TabsContent value="roles" className="mt-0 border-none p-0 shadow-none bg-transparent">
                    <RolesPage hideHeader />
                </TabsContent>
            </Tabs>
        </div>
    );
}
