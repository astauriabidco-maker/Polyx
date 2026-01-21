'use client';

import { useAuthStore } from '@/application/store/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getLearnerSelfAction, getLearnerPlanningAction, getLearnerDocumentsAction } from '@/application/actions/learner.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Clock, LogOut, ChevronRight, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function LearnerDashboard() {
    const { user, logout } = useAuthStore();
    const router = useRouter();
    const [learner, setLearner] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            // router.push('/login'); // Handled by auth guard usually, but safe to keep
            return;
        }

        async function load() {
            setIsLoading(true);
            const res = await getLearnerSelfAction(user!.id);
            if (res.success && res.data) {
                setLearner(res.data);

                // Load related data
                const [planRes, docRes] = await Promise.all([
                    getLearnerPlanningAction(res.data.id),
                    getLearnerDocumentsAction(res.data.id)
                ]);

                if (planRes.success) setSessions(planRes.data || []);
                if (docRes.success) setDocuments(docRes.data || []);
            } else {
                // Not a learner? Redirect or show error
                console.error("Not a learner profile linked");
            }
            setIsLoading(false);
        }

        load();
    }, [user, router]);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-pulse text-indigo-600 font-bold">Chargement de votre espace...</div></div>;
    }

    if (!learner) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
                <h1 className="text-xl font-bold text-slate-800 mb-2">Accès non autorisé</h1>
                <p className="text-slate-500 mb-6">Aucun profil apprenant n'est associé à ce compte.</p>
                <Button onClick={handleLogout}>Se déconnecter</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header Mobile-First */}
            <header className="bg-white px-6 py-6 sticky top-0 z-10 shadow-sm border-b border-slate-100 mb-6 flex justify-between items-center">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Espace Apprenant</p>
                    <h1 className="text-xl font-black text-slate-900 leading-none">Bonjour, {learner.firstName}</h1>
                </div>
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200 shadow-sm">
                    {learner.firstName.charAt(0)}{learner.lastName.charAt(0)}
                </div>
            </header>

            <main className="px-4 space-y-6 max-w-lg mx-auto md:max-w-4xl">

                {/* Next Session Card */}
                <section>
                    <h2 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <Calendar size={16} /> Prochaine Session
                    </h2>
                    {sessions.length > 0 ? (
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                <Clock size={100} />
                            </div>
                            <CardContent className="p-6 relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold border border-white/10 shadow-sm">
                                        {format(new Date(sessions[0].date), 'EEEE d MMMM', { locale: fr })}
                                    </div>
                                    <div className="bg-indigo-900/40 backdrop-blur-md h-8 w-8 rounded-full flex items-center justify-center border border-white/10">
                                        <ChevronRight size={18} />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black mb-1">{sessions[0].training?.title || 'Formation'}</h3>
                                <p className="text-indigo-100 text-sm font-medium mb-4">
                                    {sessions[0].startTime} - {sessions[0].endTime} • {sessions[0].location || 'Distanciel'}
                                </p>

                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                                    <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                                        <User size={12} />
                                    </div>
                                    <span className="text-xs font-medium text-indigo-50">
                                        Formateur: {sessions[0].formateurName || 'Non assigné'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 shadow-none">
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-300">
                                    <Calendar size={24} />
                                </div>
                                <p className="text-sm font-bold text-slate-500">Aucune session planifiée</p>
                                <p className="text-xs text-slate-400">Votre planning est vide pour le moment.</p>
                            </CardContent>
                        </Card>
                    )}
                </section>

                {/* Quick Stats Grid */}
                <section className="grid grid-cols-2 gap-3">
                    <Card className="border-slate-100 shadow-sm bg-white">
                        <CardContent className="p-4 flex flex-col items-center text-center">
                            <span className="text-3xl font-black text-slate-900 mb-1">
                                {sessions.length}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sessions à venir</span>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-100 shadow-sm bg-white">
                        <CardContent className="p-4 flex flex-col items-center text-center">
                            <span className="text-3xl font-black text-slate-900 mb-1">
                                {documents.length}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Documents</span>
                        </CardContent>
                    </Card>
                </section>

                {/* Documents List */}
                <section>
                    <h2 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <FileText size={16} /> Documents Récents
                    </h2>
                    <div className="space-y-3">
                        {documents.slice(0, 3).map((doc: any) => (
                            <div key={doc.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 border border-slate-100">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{doc.type}</p>
                                        <p className="text-xs text-slate-400">{format(new Date(doc.createdAt), 'd MMM yyyy', { locale: fr })}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold text-xs" onClick={() => window.open(doc.fileUrl, '_blank')}>
                                    Ouvrir
                                </Button>
                            </div>
                        ))}
                        {documents.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-sm italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                Aucun document disponible.
                            </div>
                        )}
                    </div>
                </section>

                <div className="pt-8 flex justify-center">
                    <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                        <LogOut size={16} className="mr-2" /> Se déconnecter
                    </Button>
                </div>
            </main>
        </div>
    );
}
