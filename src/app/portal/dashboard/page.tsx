'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store'; // Note: In real portal, this would use a different auth context
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Users, Clock, TrendingUp, CheckCircle2,
    ArrowRight, GraduationCap, Briefcase
} from 'lucide-react';
import { getClientPortalDashboardAction } from '@/application/actions/portal.actions';

export default function PortalDashboard() {
    // Mock user for demo - In production, use real User.clientCompanyId
    const mockClientCompanyId = "cm5k9..."; // Should be dynamic
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulating fetch
        // In real execution, we need a valid ID. 
        // For the sake of the demo, we won't fetch real data if we don't have a linked user yet.
        // But the UI will be ready.
        setIsLoading(false);
    }, []);

    // Placeholder data for design review
    const stats = {
        totalLearners: 12,
        activeLearners: 5,
        completedTrainings: 43,
        totalHours: 350,
        totalBilled: 15400,
        dueAmount: 2400
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Welcome Banner */}
            <div className="bg-indigo-600 rounded-2xl p-8 text-white shadow-xl shadow-indigo-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Bonjour, Équipe RH 👋</h1>
                        <p className="text-indigo-100 max-w-xl">
                            Bienvenue sur votre espace de pilotage formation. Suivez la montée en compétences de vos équipes et gérez vos documents administratifs en temps réel.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold border-none">
                            <Users size={18} className="mr-2" /> Inscrire un collaborateur
                        </Button>
                    </div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Collaborateurs</p>
                                <h3 className="text-2xl font-black text-slate-900">{stats.totalLearners}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">En formation</p>
                                <h3 className="text-2xl font-black text-slate-900">{stats.activeLearners}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Heures Réalisées</p>
                                <h3 className="text-2xl font-black text-slate-900">{stats.totalHours}h</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Formations Terminées</p>
                                <h3 className="text-2xl font-black text-slate-900">{stats.completedTrainings}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Active Trainings List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card className="h-full border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                            <CardTitle className="text-lg font-bold text-slate-800 flex items-center justify-between">
                                <span>Formations en cours</span>
                                <Button variant="link" className="text-indigo-600 font-medium text-sm p-0">Voir tout <ArrowRight size={16} className="ml-1" /></Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs ring-2 ring-white shadow-sm">
                                            JD
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-900 text-sm">Jean DUPONT</h4>
                                            <p className="text-xs text-slate-500">Anglais Business B2 • Débuté le 12/01/2026</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-block px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                                                Actif
                                            </span>
                                            <div className="mt-1 w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 w-[65%]" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-rows-2 gap-6">
                    <Card className="bg-slate-900 text-white border-none shadow-xl">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4 text-indigo-300">
                                <Briefcase size={20} />
                                <span className="font-bold text-xs uppercase tracking-widest">Facturation</span>
                            </div>
                            <h3 className="text-3xl font-black mb-1">{stats.dueAmount.toLocaleString('fr-FR')}€</h3>
                            <p className="text-slate-400 text-sm mb-6">Restant à payer (Échéance 30j)</p>
                            <Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold">
                                Payer Maintenant
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-indigo-50 to-white">
                        <CardContent className="p-6 flex flex-col justify-center">
                            <h4 className="font-bold text-indigo-900 mb-2">Besoin d'une nouvelle formation ?</h4>
                            <p className="text-sm text-indigo-700/80 mb-4">
                                Consultez notre catalogue 2026 et inscrivez vos collaborateurs en 3 clics.
                            </p>
                            <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-100 w-fit">
                                <GraduationCap size={16} className="mr-2" /> Voir le Catalogue
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
