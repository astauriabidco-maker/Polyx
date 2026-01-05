import { Trophy, Phone, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AGENTS = [
    { id: 1, name: 'Sarah Connor', avatar: 'SC', calls: 342, deals: 28, score: 98 },
    { id: 2, name: 'John Wick', avatar: 'JW', calls: 156, deals: 24, score: 92 },
    { id: 3, name: 'Ellen Ripley', avatar: 'ER', calls: 210, deals: 19, score: 88 },
];

export function AgentLeaderboard() {
    return (
        <Card className="bg-slate-900 border-slate-800 text-slate-50 h-full">
            <CardHeader className="border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                    <Trophy size={18} className="text-yellow-500" />
                    <CardTitle className="text-lg">Top Performers</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="divide-y divide-slate-800">
                    {AGENTS.map((agent, index) => (
                        <div key={agent.id} className="flex items-center gap-4 py-4">
                            <div className="relative font-bold text-slate-600 w-4 text-center">
                                {index === 0 && <span className="text-yellow-500 text-lg">1</span>}
                                {index === 1 && <span className="text-slate-300 text-lg">2</span>}
                                {index === 2 && <span className="text-amber-700 text-lg">3</span>}
                                {index > 2 && index + 1}
                            </div>

                            <div className="h-10 w-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-slate-300">
                                {agent.avatar}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{agent.name}</p>
                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                    <span className="flex items-center gap-1"><Phone size={10} /> {agent.calls}</span>
                                    <span className="flex items-center gap-1 text-green-400"><CheckCircle size={10} /> {agent.deals} sales</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-lg font-bold text-indigo-400">{agent.score}</div>
                                <div className="text-[10px] uppercase text-slate-500 font-semibold">Score</div>
                            </div>
                        </div>
                    ))}
                </div>

                <button className="w-full mt-2 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors border border-dashed border-slate-700 rounded hover:border-slate-500">
                    View all agents
                </button>
            </CardContent>
        </Card>
    );
}
