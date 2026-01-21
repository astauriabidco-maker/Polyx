import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface KPICardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    trendDirection?: 'up' | 'down' | 'neutral';
    color?: 'indigo' | 'green' | 'blue' | 'purple' | 'orange';
}

export function KPICard({ title, value, icon: Icon, trend, trendDirection = 'neutral', color = 'indigo' }: KPICardProps) {
    const colorStyles = {
        indigo: 'bg-indigo-500/10 text-indigo-500',
        green: 'bg-green-500/10 text-green-500',
        blue: 'bg-blue-500/10 text-blue-500',
        purple: 'bg-purple-500/10 text-purple-500',
        orange: 'bg-orange-500/10 text-orange-500',
    };

    const trendColor =
        trendDirection === 'up' ? 'text-green-500' :
            trendDirection === 'down' ? 'text-red-500' : 'text-slate-400';

    return (
        <Card className="bg-slate-900 border-slate-800 text-slate-50">
            <CardContent className="p-6 flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
                    <div className="text-2xl font-bold">{value}</div>
                    {trend && (
                        <div className={`text-xs mt-2 flex items-center ${trendColor}`}>
                            <span>{trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '•'} {trend}</span>
                            <span className="text-slate-500 ml-1">vs last period</span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-xl ${colorStyles[color]}`}>
                    <Icon size={24} />
                </div>
            </CardContent>
        </Card>
    );
}
