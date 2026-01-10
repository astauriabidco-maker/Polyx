'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    LayoutGrid,
    Plus,
    X,
    TrendingUp,
    Users,
    Phone,
    DollarSign,
    BarChart3,
    Activity,
    Target,
    Clock,
    Settings2
} from 'lucide-react';

// Widget Type Definitions
export type WidgetType = 'KPI' | 'CHART' | 'TABLE' | 'LEADERBOARD';

export interface WidgetConfig {
    id: string;
    type: WidgetType;
    title: string;
    metric: string;
    icon: string;
    color: string;
    size: 'sm' | 'md' | 'lg';
}

// Available Widgets Catalog
const WIDGET_CATALOG: WidgetConfig[] = [
    { id: 'w1', type: 'KPI', title: 'Volume Leads', metric: 'leads_count', icon: 'Users', color: 'indigo', size: 'sm' },
    { id: 'w2', type: 'KPI', title: 'CA Pipeline', metric: 'pipeline_value', icon: 'DollarSign', color: 'emerald', size: 'sm' },
    { id: 'w3', type: 'KPI', title: 'Taux Réponse', metric: 'answer_rate', icon: 'Phone', color: 'amber', size: 'sm' },
    { id: 'w4', type: 'KPI', title: 'RDV Fixés', metric: 'appointments', icon: 'Target', color: 'purple', size: 'sm' },
    { id: 'w5', type: 'CHART', title: 'Évolution Leads', metric: 'leads_trend', icon: 'TrendingUp', color: 'blue', size: 'lg' },
    { id: 'w6', type: 'LEADERBOARD', title: 'Top Commerciaux', metric: 'agent_ranking', icon: 'BarChart3', color: 'rose', size: 'md' },
    { id: 'w7', type: 'KPI', title: 'Délai Moyen', metric: 'avg_delay', icon: 'Clock', color: 'cyan', size: 'sm' },
    { id: 'w8', type: 'TABLE', title: 'Leads Chauds', metric: 'hot_leads', icon: 'Activity', color: 'orange', size: 'md' },
];

// Mock Data for Widgets
const MOCK_DATA: Record<string, any> = {
    leads_count: { value: '245', trend: '+12%', trendDirection: 'up' },
    pipeline_value: { value: '125k€', trend: '+8%', trendDirection: 'up' },
    answer_rate: { value: '68%', trend: '-2%', trendDirection: 'down' },
    appointments: { value: '34', trend: '+5', trendDirection: 'up' },
    avg_delay: { value: '4h12', trend: '-15m', trendDirection: 'up' },
    agent_ranking: [
        { name: 'Sophie M.', score: 92 },
        { name: 'Lucas D.', score: 87 },
        { name: 'Emma R.', score: 81 },
    ],
    hot_leads: [
        { name: 'Jean Dupont', score: 95, source: 'Site Web' },
        { name: 'Marie Martin', score: 88, source: 'Facebook' },
    ],
};

function getIcon(iconName: string, size: number = 16) {
    const icons: Record<string, any> = { Users, DollarSign, Phone, Target, TrendingUp, BarChart3, Clock, Activity };
    const Icon = icons[iconName] || Activity;
    return <Icon size={size} />;
}

function KPIWidget({ config }: { config: WidgetConfig }) {
    const data = MOCK_DATA[config.metric] || { value: 'N/A', trend: '', trendDirection: 'stable' };

    return (
        <Card className={`bg-slate-900 border-slate-800 text-slate-100`}>
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500 uppercase tracking-widest">{config.title}</span>
                    <span className={`text-${config.color}-400`}>{getIcon(config.icon)}</span>
                </div>
                <div className="text-2xl font-black">{data.value}</div>
                <Badge
                    variant="outline"
                    className={`mt-2 text-[10px] ${data.trendDirection === 'up' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
                >
                    {data.trend}
                </Badge>
            </CardContent>
        </Card>
    );
}

function LeaderboardWidget({ config }: { config: WidgetConfig }) {
    const data = MOCK_DATA[config.metric] || [];

    return (
        <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    {getIcon(config.icon)} {config.title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {data.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-300">{idx + 1}. {item.name}</span>
                        <span className="font-bold text-indigo-400">{item.score}</span>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function WidgetRenderer({ config }: { config: WidgetConfig }) {
    switch (config.type) {
        case 'KPI': return <KPIWidget config={config} />;
        case 'LEADERBOARD': return <LeaderboardWidget config={config} />;
        default: return <KPIWidget config={config} />;
    }
}

export function CustomDashboardBuilder({ userId }: { userId?: string }) {
    const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Load config on mount
    useEffect(() => {
        async function loadConfig() {
            if (!userId) {
                setWidgets([WIDGET_CATALOG[0], WIDGET_CATALOG[1], WIDGET_CATALOG[2], WIDGET_CATALOG[3]]);
                setIsLoading(false);
                return;
            }

            try {
                const { getDashboardConfigAction } = await import('@/application/actions/dashboard.actions');
                const result = await getDashboardConfigAction(userId);
                if (result.success && result.config) {
                    setWidgets(result.config.widgets as WidgetConfig[]);
                } else {
                    setWidgets([WIDGET_CATALOG[0], WIDGET_CATALOG[1], WIDGET_CATALOG[2], WIDGET_CATALOG[3]]);
                }
            } catch (error) {
                console.error('Error loading dashboard config:', error);
                setWidgets([WIDGET_CATALOG[0], WIDGET_CATALOG[1], WIDGET_CATALOG[2], WIDGET_CATALOG[3]]);
            }
            setIsLoading(false);
        }
        loadConfig();
    }, [userId]);

    // Save config when widgets change (debounced)
    useEffect(() => {
        if (isLoading || !userId) return;

        const timer = setTimeout(async () => {
            setIsSaving(true);
            try {
                const { saveDashboardConfigAction } = await import('@/application/actions/dashboard.actions');
                await saveDashboardConfigAction(userId, widgets);
            } catch (error) {
                console.error('Error saving dashboard config:', error);
            }
            setIsSaving(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, [widgets, userId, isLoading]);

    const addWidget = (widget: WidgetConfig) => {
        if (!widgets.find(w => w.id === widget.id)) {
            setWidgets([...widgets, { ...widget, id: `${widget.id}-${Date.now()}` }]);
        }
    };

    const removeWidget = (widgetId: string) => {
        setWidgets(widgets.filter(w => w.id !== widgetId));
    };

    if (isLoading) {
        return (
            <div className="py-20 text-center text-slate-500">
                <LayoutGrid size={48} className="mx-auto mb-4 animate-pulse text-indigo-400" />
                <p>Chargement de votre dashboard...</p>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
                        <LayoutGrid className="text-indigo-400" /> Mon Tableau de Bord
                    </h2>
                    <p className="text-slate-500 text-sm">Personnalisez vos indicateurs clés.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={isEditing ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                        className={isEditing ? "bg-indigo-600 hover:bg-indigo-700" : "border-slate-800 text-slate-400"}
                    >
                        <Settings2 size={14} className="mr-1.5" />
                        {isEditing ? 'Terminer' : 'Modifier'}
                    </Button>
                    {isEditing && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                                    <Plus size={14} className="mr-1.5" /> Ajouter
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <LayoutGrid className="text-indigo-400" /> Catalogue de Widgets
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-500">
                                        Sélectionnez un widget à ajouter à votre tableau de bord.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    {WIDGET_CATALOG.map(widget => (
                                        <Card
                                            key={widget.id}
                                            className="bg-slate-800 border-slate-700 hover:border-indigo-500 cursor-pointer transition-all"
                                            onClick={() => addWidget(widget)}
                                        >
                                            <CardContent className="p-4 flex items-center gap-3">
                                                <div className={`p-2 rounded-lg bg-${widget.color}-500/10 text-${widget.color}-400`}>
                                                    {getIcon(widget.icon, 20)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-slate-200">{widget.title}</div>
                                                    <div className="text-xs text-slate-500">{widget.type}</div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {widgets.map(widget => (
                    <div key={widget.id} className="relative group">
                        {isEditing && (
                            <button
                                onClick={() => removeWidget(widget.id)}
                                className="absolute -top-2 -right-2 z-10 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                                <X size={12} />
                            </button>
                        )}
                        <WidgetRenderer config={widget} />
                    </div>
                ))}
            </div>

            {widgets.length === 0 && (
                <div className="py-20 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                    <LayoutGrid size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Aucun widget configuré.</p>
                    <p className="text-sm">Cliquez sur "Modifier" puis "Ajouter" pour personnaliser votre tableau de bord.</p>
                </div>
            )}
        </div>
    );
}
