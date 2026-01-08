'use client';

import { useEffect, useState } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getLeadCallInsightsAction, bulkAnalyzeCallsAction } from '@/application/actions/call-intelligence.actions';

interface CallInsightsProps {
    leadId: string;
    onUpdate?: () => void;
}

interface Insights {
    totalCalls: number;
    analyzedCalls: number;
    dominantSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    sentimentBreakdown: { POSITIVE: number; NEUTRAL: number; NEGATIVE: number };
    topObjections: { name: string; count: number }[];
    topBuyingSignals: { name: string; count: number }[];
    lastAnalyzedAt: string;
}

export function CallInsights({ leadId, onUpdate }: CallInsightsProps) {
    const [insights, setInsights] = useState<Insights | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        loadInsights();
    }, [leadId]);

    const loadInsights = async () => {
        setIsLoading(true);
        const res = await getLeadCallInsightsAction(leadId);
        if (res.success && res.insights) {
            setInsights(res.insights);
        } else {
            setInsights(null);
        }
        setIsLoading(false);
    };

    const handleBulkAnalyze = async () => {
        setIsAnalyzing(true);
        const res = await bulkAnalyzeCallsAction(leadId);
        if (res.success) {
            await loadInsights();
            onUpdate?.();
        }
        setIsAnalyzing(false);
    };

    const getSentimentIcon = (sentiment: string) => {
        switch (sentiment) {
            case 'POSITIVE': return <TrendingUp className="text-emerald-500" size={18} />;
            case 'NEGATIVE': return <TrendingDown className="text-red-500" size={18} />;
            default: return <Minus className="text-slate-400" size={18} />;
        }
    };

    const getSentimentColor = (sentiment: string) => {
        switch (sentiment) {
            case 'POSITIVE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'NEGATIVE': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const getSentimentLabel = (sentiment: string) => {
        switch (sentiment) {
            case 'POSITIVE': return 'Positif';
            case 'NEGATIVE': return 'Négatif';
            default: return 'Neutre';
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                <div className="flex items-center gap-2 text-indigo-600">
                    <Brain className="animate-pulse" size={18} />
                    <span className="text-sm font-medium">Chargement des insights IA...</span>
                </div>
            </div>
        );
    }

    if (!insights) {
        return (
            <div className="p-4 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Brain className="text-slate-400" size={18} />
                        <span className="text-sm text-slate-600">Aucun appel analysé</span>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkAnalyze}
                        disabled={isAnalyzing}
                        className="text-xs gap-1"
                    >
                        {isAnalyzing ? <RotateCcw className="animate-spin" size={12} /> : <Sparkles size={12} />}
                        Analyser les appels
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="text-indigo-600" size={18} />
                    <span className="font-bold text-slate-900">Insights IA</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded font-medium">
                        {insights.analyzedCalls}/{insights.totalCalls} appels
                    </span>
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleBulkAnalyze}
                    disabled={isAnalyzing}
                    className="text-xs h-7 px-2 text-indigo-600 hover:bg-indigo-100"
                >
                    {isAnalyzing ? <RotateCcw className="animate-spin" size={12} /> : <RotateCcw size={12} />}
                </Button>
            </div>

            {/* Sentiment */}
            <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${getSentimentColor(insights.dominantSentiment)}`}>
                    {getSentimentIcon(insights.dominantSentiment)}
                    <span className="text-sm font-bold">{getSentimentLabel(insights.dominantSentiment)}</span>
                </div>
                <div className="flex gap-1 text-[10px]">
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">{insights.sentimentBreakdown.POSITIVE} ✓</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{insights.sentimentBreakdown.NEUTRAL} —</span>
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded">{insights.sentimentBreakdown.NEGATIVE} ✗</span>
                </div>
            </div>

            {/* Objections */}
            {insights.topObjections.length > 0 && (
                <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <AlertTriangle size={10} /> Objections Détectées
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {insights.topObjections.map((obj, i) => (
                            <span
                                key={i}
                                className="text-xs px-2 py-1 bg-amber-50 text-amber-800 rounded border border-amber-200 font-medium"
                            >
                                {obj.name} <span className="text-amber-500">×{obj.count}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Buying Signals */}
            {insights.topBuyingSignals.length > 0 && (
                <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Sparkles size={10} /> Signaux d'Achat
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {insights.topBuyingSignals.map((sig, i) => (
                            <span
                                key={i}
                                className="text-xs px-2 py-1 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 font-medium"
                            >
                                {sig.name} <span className="text-emerald-500">×{sig.count}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
