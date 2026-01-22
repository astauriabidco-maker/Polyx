'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/application/store/auth-store';
import { checkIsGlobalAdminAction } from '@/application/actions/auth.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Building2,
    MapPin,
    Users,
    ShieldCheck,
    Globe,
    ArrowRight,
    Sparkles,
    Network
} from 'lucide-react';

export default function AdminDashboardPage() {
    const { activeOrganization } = useAuthStore();
    const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

    useEffect(() => {
        checkIsGlobalAdminAction().then(setIsGlobalAdmin);
    }, []);

    const quickLinks = [
        {
            title: 'Profil & Identité',
            description: 'Configurez l\'identité légale, les certifications et le branding.',
            href: '/app/admin/profile',
            icon: Building2,
            color: 'bg-blue-50 text-blue-600 border-blue-100'
        },
        {
            title: 'Gestion des Agences',
            description: 'Gérez vos sites physiques et centres d\'examens.',
            href: '/app/admin/agencies',
            icon: MapPin,
            color: 'bg-emerald-50 text-emerald-600 border-emerald-100'
        },
        {
            title: 'Équipes & Accès',
            description: 'Gérez vos collaborateurs, rôles et permissions.',
            href: '/app/admin/teams',
            icon: Users,
            color: 'bg-purple-50 text-purple-600 border-purple-100'
        },
        {
            title: 'Intégrations & API',
            description: 'Connectez vos outils (WhatsApp, Stripe, EDOF, LMS...).',
            href: '/app/settings/integrations',
            icon: Globe,
            color: 'bg-amber-50 text-amber-600 border-amber-100'
        }
    ];

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <ShieldCheck size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Administration</h1>
                    <p className="text-slate-500 font-medium">
                        {activeOrganization?.name || 'Votre Organisme'}
                    </p>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {quickLinks.map((link, index) => (
                    <Link key={index} href={link.href}>
                        <Card className="border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer group h-full">
                            <CardContent className="p-6">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 border ${link.color}`}>
                                    <link.icon size={24} />
                                </div>
                                <h3 className="font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{link.title}</h3>
                                <p className="text-sm text-slate-500">{link.description}</p>
                                <div className="flex items-center gap-1 text-indigo-600 text-sm font-bold mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Accéder <ArrowRight size={14} />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Super Admin Section */}
            {isGlobalAdmin && (
                <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-indigo-700">
                            <Globe size={20} />
                            Maintenance Plateforme
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-indigo-600/80 mb-4">
                            Vous êtes Super-Administrateur. Accédez au Nexus Master pour gérer l'ensemble de la plateforme.
                        </p>
                        <div className="flex gap-3">
                            <Link href="/app/admin/nexus">
                                <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                                    <Globe size={16} className="mr-2" /> Ouvrir Nexus Master
                                </Button>
                            </Link>
                            <Link href="/app/franchises">
                                <Button variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                                    <Network size={16} className="mr-2" /> Gestion Franchises
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Help Card */}
            <Card className="bg-slate-50/50 border-slate-100">
                <CardContent className="p-6 flex items-start gap-4">
                    <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0">
                        <Sparkles size={20} className="text-indigo-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 mb-1">Besoin d'aide ?</h4>
                        <p className="text-sm text-slate-500">
                            Utilisez la navigation latérale pour accéder aux différentes sections de l'administration.
                            Chaque section vous permet de configurer un aspect spécifique de votre organisme.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
