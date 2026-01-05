'use client';

import React, { useEffect, useState } from 'react';
import {
    getAllOrganisations,
    getPlatformStats,
    toggleOrganisationStatus
} from '@/actions/super-admin';
import {
    Building2,
    Users,
    Activity,
    Clock,
    Search,
    Globe,
    ShieldCheck,
    MoreVertical,
    CheckCircle2,
    XCircle,
    LayoutGrid
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SuperAdminDashboard() {
    const [orgs, setOrgs] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        const [orgsRes, statsRes] = await Promise.all([
            getAllOrganisations(),
            getPlatformStats()
        ]);

        if (orgsRes.success) setOrgs(orgsRes.organisations || []);
        if (statsRes.success) setStats(statsRes.stats);
        setIsLoading(false);
    };

    const handleToggleStatus = async (orgId: string, currentStatus: boolean) => {
        const res = await toggleOrganisationStatus(orgId, !currentStatus);
        if (res.success) {
            setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, isActive: !currentStatus } : o));
        }
    };

    const filteredOrgs = orgs.filter(o =>
        o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.siret && o.siret.includes(searchTerm))
    );

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-bold animate-pulse">Initialisation du Nexus Polyx...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header Premium */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-[1600px] mx-auto px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Globe size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">Polyx Nexus</h1>
                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Platform Management</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                            <ShieldCheck size={16} className="text-emerald-500" />
                            <span className="text-xs font-bold text-slate-600">Super-Admin Session</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => window.location.href = '/hub'}>
                            <LayoutGrid size={18} className="mr-2" /> Retour au Hub
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-[1600px] mx-auto px-8 pt-8 space-y-8">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard title="Organisations Total" value={stats?.totalOrgs} icon={<Building2 className="text-indigo-600" />} color="bg-indigo-50" />
                    <KPICard title="Utilisateurs Plateforme" value={stats?.totalUsers} icon={<Users className="text-blue-600" />} color="bg-blue-50" />
                    <KPICard title="Accès Actifs" value={stats?.totalAccessGrants} icon={<Activity className="text-emerald-600" />} color="bg-emerald-50" />
                    <KPICard title="Invitations en attente" value={stats?.pendingInvitations} icon={<Clock className="text-orange-600" />} color="bg-orange-50" />
                </div>

                {/* Organizations Table Card */}
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between py-6">
                        <div>
                            <CardTitle className="text-xl font-black">Répertoire des Tenants</CardTitle>
                            <p className="text-sm text-slate-500">Gérez l'accès et le statut de tous les OF du réseau.</p>
                        </div>
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <Input
                                placeholder="Rechercher par nom ou SIRET..."
                                className="pl-10 h-11 bg-slate-50 border-slate-100 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-4">Organisation</th>
                                        <th className="px-6 py-4">Stats Entité</th>
                                        <th className="px-6 py-4">Date Création</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-8 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredOrgs.map((org) => (
                                        <tr key={org.id} className="hover:bg-slate-50/30 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 shadow-sm group-hover:scale-110 transition-all">
                                                        <Building2 size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{org.name}</p>
                                                        <p className="text-xs text-slate-400 font-mono italic">SIRET: {org.siret || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex gap-4">
                                                    <StatMini label="Users" value={org._count?.accessGrants} />
                                                    <StatMini label="Roles" value={org._count?.roles} />
                                                    <StatMini label="Agences" value={org._count?.agencies} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-sm font-medium text-slate-500">
                                                {new Date(org.createdAt).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td className="px-6 py-5">
                                                <button
                                                    onClick={() => handleToggleStatus(org.id, org.isActive)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${org.isActive
                                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                            : 'bg-rose-50 text-rose-500 border border-rose-100'
                                                        }`}
                                                >
                                                    {org.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                    {org.isActive ? 'Actif' : 'Bloqué'}
                                                </button>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreVertical size={16} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredOrgs.length === 0 && (
                            <div className="py-20 text-center flex flex-col items-center">
                                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                                    <Search size={32} />
                                </div>
                                <p className="text-slate-500 font-medium">Aucune organisation ne correspond à votre recherche.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

function KPICard({ title, value, icon, color }: { title: string, value: any, icon: any, color: string }) {
    return (
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${color}`}>
                        {icon}
                    </div>
                </div>
                <div>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">{value ?? '...'}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function StatMini({ label, value }: { label: string, value: number }) {
    return (
        <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</span>
            <span className="text-sm font-black text-slate-700">{value}</span>
        </div>
    );
}
