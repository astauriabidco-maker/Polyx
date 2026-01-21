import { TrendingUp, RefreshCcw, MessageSquare } from 'lucide-react';
import { LeadWithOrg, Lead } from '@/domain/entities/lead';
import { LeadService } from '@/application/services/lead.service';
import { ScriptService } from '@/application/services/script.service';

interface LeadInsightsProps {
    lead: LeadWithOrg;
    isRefreshingScore: boolean;
    onRefreshScore: () => void;
}

export function LeadInsights({ lead, isRefreshingScore, onRefreshScore }: LeadInsightsProps) {
    return (
        <div className="space-y-6">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={14} className="text-indigo-500" />
                        Insights Scoring IA
                    </h4>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onRefreshScore}
                            disabled={isRefreshingScore}
                            className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-indigo-400"
                            title="Recalculer le score prédictif"
                        >
                            <RefreshCcw size={12} className={isRefreshingScore ? 'animate-spin' : ''} />
                        </button>
                        <div className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 rounded text-indigo-400 text-xs font-bold">
                            {lead.score}% Probabilité
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    {LeadService.getScoringInsights(lead as Lead).map((insight, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-slate-950/50 border border-slate-800/50">
                            <span className="text-lg">{insight.icon}</span>
                            <span className={`text-xs font-medium ${insight.type === 'positive' ? 'text-emerald-400' :
                                insight.type === 'negative' ? 'text-rose-400' :
                                    'text-yellow-400'
                                }`}>
                                {insight.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/20 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <MessageSquare size={16} className="text-indigo-400" />
                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Guide d'Entretien (IA)</h4>
                </div>
                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {ScriptService.getCallScript(lead as Lead).split('\n').map((line, i) => {
                        if (line.startsWith('###')) return <h5 key={i} className="font-bold text-slate-100 mb-2 mt-2">{line.replace('###', '')}</h5>;
                        const parts = line.split(/(\*\*.*?\*\*)/g);
                        return (
                            <p key={i} className="mb-1">
                                {parts.map((p, j) => p.startsWith('**') ? <strong key={j} className="text-white bg-white/5 px-1 rounded">{p.replace(/\*\*/g, '')}</strong> : p)}
                            </p>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
