
import { useState, useEffect } from 'react';
import { Trophy, Phone, Medal, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/application/store/auth-store';
import { getLeaderboardAction } from '@/application/actions/gamification.actions';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { GamificationHub } from '@/components/gamification/gamification-hub';

interface LeaderboardAgent {
    id: string;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
    gamificationScore: number;
    gamificationLevel: number;
    achievements: { achievement: { icon: string | null, name: string } }[];
    _count: { calls: number };
}

export function AgentLeaderboard() {
    const { activeOrganization, user } = useAuthStore();
    const [agents, setAgents] = useState<LeaderboardAgent[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (activeOrganization?.id) {
            loadLeaderboard();
        }
    }, [activeOrganization?.id]);

    const loadLeaderboard = async () => {
        if (!activeOrganization) return;
        setIsLoading(true);
        const res = await getLeaderboardAction(activeOrganization.id);
        if (res.success && res.leaderboard) {
            setAgents(res.leaderboard as any);
        }
        setIsLoading(false);
    };

    if (!activeOrganization) return null;

    return (
        <Dialog>
            <Card className="bg-slate-900 border-slate-800 text-slate-50 h-full flex flex-col">
                <CardHeader className="border-b border-slate-800 pb-4 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Trophy size={18} className="text-yellow-500" />
                            <CardTitle className="text-lg">Classement</CardTitle>
                        </div>
                        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Top Vendeurs</span>
                    </div>
                </CardHeader>
                <CardContent className="pt-0 flex-1 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">Chargement...</div>
                    ) : agents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm">
                            <Shield className="mb-2 opacity-20" size={32} />
                            <p>Aucune donnée encore</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {agents.map((agent, index) => (
                                <div key={agent.id} className="flex items-center gap-4 py-4 animate-in slide-in-from-bottom-2" style={{ animationDelay: `${index * 50}ms` }}>
                                    <div className="relative font-bold text-slate-600 w-6 text-center shrink-0">
                                        {index === 0 && <span className="text-yellow-500 text-lg drop-shadow-lg">1</span>}
                                        {index === 1 && <span className="text-slate-300 text-lg">2</span>}
                                        {index === 2 && <span className="text-amber-700 text-lg">3</span>}
                                        {index > 2 && index + 1}
                                    </div>

                                    <div className="relative">
                                        <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center font-bold text-slate-300 overflow-hidden bg-slate-800 
                                            ${index === 0 ? 'border-yellow-500/50 shadow-yellow-500/20 shadow-lg' :
                                                index === 1 ? 'border-slate-400/50' :
                                                    index === 2 ? 'border-amber-700/50' : 'border-slate-700'}`}>
                                            {agent.image ? (
                                                <img src={agent.image} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span>
                                                    {(agent.firstName?.[0] || '') + (agent.lastName?.[0] || '')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-slate-700 text-[8px] font-bold px-1.5 text-slate-300">
                                            Lv.{agent.gamificationLevel}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">
                                            {agent.firstName} {agent.lastName}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                            <span className="flex items-center gap-1" title="Appels passés">
                                                <Phone size={10} className="text-slate-500" /> {agent._count?.calls || 0}
                                            </span>
                                            {agent.achievements.length > 0 && (
                                                <span className="flex items-center gap-1 text-indigo-400" title="Badges débloqués">
                                                    <Medal size={10} /> {agent.achievements.length}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="text-lg font-bold text-indigo-400 leading-none">{agent.gamificationScore}</div>
                                        <div className="text-[9px] uppercase text-slate-600 font-bold mt-1">XP</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {user && (
                        <div className="mt-4 pt-4 border-t border-slate-800">
                            <DialogTrigger asChild>
                                <button className="w-full py-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors border border-dashed border-indigo-900/50 bg-indigo-950/20 rounded hover:bg-indigo-900/40 flex items-center justify-center gap-2">
                                    <Trophy size={14} /> Voir mon profil & Badges
                                </button>
                            </DialogTrigger>
                        </div>
                    )}
                </CardContent>

                <DialogContent className="max-w-4xl bg-slate-950 border-slate-800 text-white max-h-[90vh] overflow-y-auto w-full">
                    <DialogTitle>Mon Profil Joueur</DialogTitle>
                    <GamificationHub />
                </DialogContent>
            </Card>
        </Dialog>
    );
}
