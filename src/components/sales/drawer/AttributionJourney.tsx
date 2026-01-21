import { useEffect, useState } from 'react';
import { Target, ArrowRight, MousePointer2, FileText, MessageSquare, Globe, Link } from 'lucide-react';
import { getLeadTouchpointsAction } from '@/application/actions/lead.actions';
import { AttributionService, AttributionModel } from '@/application/services/attribution.service';

interface AttributionJourneyProps {
    leadId: string;
}

export function AttributionJourney({ leadId }: AttributionJourneyProps) {
    const [touchpoints, setTouchpoints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [model, setModel] = useState<AttributionModel>(AttributionModel.LAST_TOUCH);

    useEffect(() => {
        const fetchTouchpoints = async () => {
            setLoading(true);
            const res = await getLeadTouchpointsAction(leadId);
            if (res.success && res.touchpoints) {
                setTouchpoints(res.touchpoints);
            }
            setLoading(false);
        };
        fetchTouchpoints();
    }, [leadId]);

    if (loading) return <div className="p-4 text-center text-xs text-slate-400">Chargement du parcours...</div>;
    if (touchpoints.length === 0) return null;

    const attribution = AttributionService.calculateAttribution(touchpoints, model);

    const getIcon = (type: string) => {
        switch (type) {
            case 'AD_CLICK': return <MousePointer2 size={14} />;
            case 'PAGE_VIEW': return <Globe size={14} />;
            case 'FORM_START': return <FileText size={14} />;
            case 'CHAT_INTERACTION': return <MessageSquare size={14} />;
            case 'LEAD_GENERATION': return <Target size={14} />;
            default: return <Link size={14} />;
        }
    };

    return (
        <div className="p-4 bg-slate-50 rounded border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Target size={16} className="text-indigo-600" />
                    Attribution Multi-touch
                </h4>
                <select
                    value={model}
                    onChange={(e) => setModel(e.target.value as AttributionModel)}
                    className="text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5 outline-none font-medium text-slate-500"
                >
                    <option value={AttributionModel.FIRST_TOUCH}>Premier Clic</option>
                    <option value={AttributionModel.LAST_TOUCH}>Dernier Clic</option>
                    <option value={AttributionModel.LINEAR}>Linéaire</option>
                    <option value={AttributionModel.U_SHAPED}>U-Shaped</option>
                </select>
            </div>

            {/* Analysis Result */}
            <div className="flex flex-wrap gap-2">
                {attribution.map((attr, idx) => (
                    <div key={idx} className="bg-white border border-indigo-100 rounded px-2 py-1 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded">
                            {Math.round(attr.weight * 100)}%
                        </span>
                        <span className="text-xs font-medium text-slate-700">{attr.source}</span>
                    </div>
                ))}
            </div>

            {/* Journey Timeline */}
            <div className="relative pl-4 space-y-4 before:content-[''] before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                {touchpoints.map((tp, idx) => (
                    <div key={tp.id} className="relative flex items-start gap-3">
                        <div className={`z-10 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white ${idx === 0 || idx === touchpoints.length - 1 ? 'bg-indigo-600 shadow-sm' : 'bg-slate-300'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${idx === 0 || idx === touchpoints.length - 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    {idx === 0 ? 'First Touch' : idx === touchpoints.length - 1 ? 'Conversion' : `Touchpoint #${idx + 1}`}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    {new Date(tp.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="p-1 bg-white rounded border border-slate-200 text-slate-500">
                                    {getIcon(tp.type)}
                                </span>
                                <span className="font-bold text-slate-700">{tp.source || 'Direct'}</span>
                                {tp.medium && <span className="text-slate-400">/ {tp.medium}</span>}
                            </div>
                            {tp.campaign && (
                                <p className="text-[10px] text-slate-500 mt-1 truncate">
                                    Campagne: <span className="italic">{tp.campaign}</span>
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
