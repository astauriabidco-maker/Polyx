
import { useState, useEffect } from 'react';
import { Trophy, Star, Lock, Medal, Flame, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthStore } from '@/application/store/auth-store';
import { getMyGamificationProfileAction } from '@/application/actions/gamification.actions';

interface Achievement {
    id: string;
    slug: string;
    name: string;
    description: string;
    icon: string;
    points: number;
    threshold: number;
}

interface UserProfile {
    firstName: string;
    lastName: string;
    gamificationScore: number;
    gamificationLevel: number;
    achievements: { achievement: Achievement, unlockedAt: string }[];
}

export function GamificationHub() {
    const { user } = useAuthStore();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            loadProfile();
        }
    }, [user]);

    const loadProfile = async () => {
        if (!user) return;
        setIsLoading(true);
        const res = await getMyGamificationProfileAction(user.id);
        if (res.success && res.profile) {
            setProfile(res.profile as any);
            setAllAchievements(res.allAchievements as any || []);
        }
        setIsLoading(false);
    };

    if (!user) return null;
    if (isLoading) return <div className="p-8 text-center text-slate-500">Chargement de votre profil joueur...</div>;

    const nextLevelXP = Math.pow((profile?.gamificationLevel || 1), 2) * 100;
    const currentLevelXP = Math.pow((profile?.gamificationLevel || 1) - 1, 2) * 100;
    const progress = Math.min(100, Math.max(0, ((profile?.gamificationScore || 0) - currentLevelXP) / (nextLevelXP - currentLevelXP) * 100));

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-indigo-900 to-slate-900 border-indigo-500/30 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-300 uppercase tracking-wider">Niveau actuel</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black">{profile?.gamificationLevel || 1}</div>
                        <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="text-xs text-indigo-300 mt-1 text-right">{Math.floor(progress)}% vers niv. {(profile?.gamificationLevel || 1) + 1}</div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Experience (XP)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold flex items-center gap-2">
                            {profile?.gamificationScore || 0}
                            <Flame className="text-orange-500" size={24} />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Gagnez de l'XP en passant des appels et en signant des contrats.</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Badges</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold flex items-center gap-2">
                            {profile?.achievements.length || 0} <span className="text-slate-600 text-xl font-normal">/ {allAchievements.length}</span>
                            <Trophy className="text-yellow-500" size={24} />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Collectionnez tous les badges pour devenir une légende.</p>
                    </CardContent>
                </Card>
            </div>

            {/* Achievements Grid */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Medal className="text-indigo-400" /> Vos Succès
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {allAchievements.map((ach) => {
                        const isUnlocked = profile?.achievements.some(ua => ua.achievement.id === ach.id);
                        return (
                            <div
                                key={ach.id}
                                className={`relative group p-4 rounded-xl border transition-all duration-300 bg-slate-900
                                    ${isUnlocked
                                        ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                                        : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-700'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`p-2 rounded-lg ${isUnlocked ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-600'}`}>
                                        {ach.icon === 'Phone' && <PhoneIcon />}
                                        {ach.icon === 'Trophy' && <TrophyIcon />}
                                        {ach.icon === 'CheckCircle' && <CheckIcon />}
                                        {ach.icon === 'Star' && <StarIcon />}
                                        {!['Phone', 'Trophy', 'CheckCircle', 'Star'].includes(ach.icon) && <StarIcon />}
                                    </div>
                                    {isUnlocked ? (
                                        <CheckCircle className="text-green-500 h-5 w-5" />
                                    ) : (
                                        <Lock className="text-slate-700 h-4 w-4" />
                                    )}
                                </div>

                                <h4 className={`font-bold text-sm mb-1 ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                                    {ach.name}
                                </h4>
                                <p className="text-xs text-slate-400 leading-snug line-clamp-2">
                                    {ach.description}
                                </p>

                                <div className="mt-3 flex items-center justify-end">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isUnlocked ? 'bg-yellow-500/10 text-yellow-500' : 'bg-slate-800 text-slate-600'}`}>
                                        +{ach.points} XP
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Simple internal icon wrappers
const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
const TrophyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const StarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;

