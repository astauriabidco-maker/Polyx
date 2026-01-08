import { Phone, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lead, LeadWithOrg } from '@/domain/entities/lead';

interface LeadCardProps {
    lead: LeadWithOrg;
    onClick: () => void;
    isUnified?: boolean;
    isSelected?: boolean; // [NEW] Multi-select
    onToggleSelect?: (id: string) => void; // [NEW]
}

export function LeadCard({ lead, onClick, isUnified, isSelected, onToggleSelect }: LeadCardProps) {
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/30';
        if (score >= 50) return 'text-yellow-400 bg-yellow-500/10 ring-yellow-500/30';
        return 'text-rose-400 bg-rose-500/10 ring-rose-500/30';
    };

    const getReviewHeatmapStyle = (score: number) => {
        if (isSelected) return 'bg-indigo-950/40 border-l-indigo-500 ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-500/10';
        if (score >= 90) return 'bg-slate-900/40 border-l-rose-500 ring-1 ring-rose-500/10';
        if (score >= 75) return 'bg-slate-900/40 border-l-orange-500 ring-1 ring-orange-500/10';
        return 'bg-slate-900/40 border-l-transparent hover:border-l-indigo-500';
    };

    return (
        <div
            className={`cursor-pointer hover:shadow-md transition-all border-l-4 rounded-lg mb-2 ${getReviewHeatmapStyle(lead.score)}`}
            onClick={onClick}
        >
            <Card className="border-0 shadow-none bg-transparent">
                <CardContent className="p-4 space-y-3 relative group/card">
                    {/* Selection Checkbox */}
                    {onToggleSelect && (
                        <div
                            className={`absolute -left-3 top-4 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 z-10 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-900 border-slate-700 opacity-0 group-hover/card:opacity-100'}`}
                            onClick={(e) => { e.stopPropagation(); onToggleSelect(lead.id); }}
                        >
                            <CheckCircle2 size={14} className={`text-white ${isSelected ? 'scale-100' : 'scale-0'} transition-transform`} />
                        </div>
                    )}

                    {/* Header: Name & Score */}
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-100'}`}>{lead.firstName} {lead.lastName}</h4>
                                {lead.callAttempts === 0 && (new Date().getTime() - new Date(lead.createdAt).getTime() < 3600000) && (
                                    <Badge className="text-[8px] px-1 h-3 bg-indigo-500 text-white border-0 animate-pulse">
                                        NOUVEAU
                                    </Badge>
                                )}
                                <Badge variant="secondary" className="text-[9px] px-1 h-4 bg-slate-800 text-slate-400 border-slate-700">
                                    {lead.status}
                                </Badge>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{lead.source}</p>
                            {isUnified && (
                                <Badge variant="outline" className="mt-1 text-[10px] bg-slate-800/50 text-slate-400 border-slate-700">
                                    {lead.organizationName || 'Est. Org'}
                                </Badge>
                            )}
                        </div>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ring-1 ${getScoreColor(lead.score)}`}>
                            {lead.score}
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                            <Phone size={12} className={lead.callAttempts > 0 ? "text-slate-200" : "text-slate-500"} />
                            <span>{lead.callAttempts} tentat.{lead.callAttempts !== 1 ? 's' : ''}</span>
                        </div>
                        {lead.nextCallbackAt && (
                            <div className="flex items-center gap-1 text-orange-400 font-medium bg-orange-500/10 px-1.5 py-0.5 rounded">
                                <Clock size={12} />
                                <span>{new Date(lead.nextCallbackAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        )}
                    </div>

                    {/* Quick Action */}
                    <div className="pt-2 flex justify-end">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[10px] text-slate-500 hover:text-white hover:bg-white/5 uppercase tracking-widest font-bold"
                            onClick={(e) => { e.stopPropagation(); onClick(); }}
                        >
                            Ouvrir Fiche
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
