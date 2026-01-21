import { Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SmartTimingWidget() {
    return (
        <Card className="bg-slate-900 border-slate-800 text-slate-50 h-full">
            <CardHeader className="border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                    <Zap size={18} className="text-yellow-500" />
                    <CardTitle className="text-lg">Smart Timing AI</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400">
                        <Clock size={32} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">Best Opportunity Window</p>
                        <p className="text-2xl font-bold text-white">Tuesday, 18:00 - 20:00</p>
                        <p className="text-xs text-green-400 font-medium">Predicted Answer Rate: 45%</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Next Best Slots</h4>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <span className="text-sm font-medium">Wednesday Morning</span>
                        <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">09:00 - 11:00</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <span className="text-sm font-medium">Thursday Lunch</span>
                        <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">12:30 - 14:00</span>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                    <p className="text-xs text-slate-500 italic text-center">
                        Based on 1,420 calls analyzed in the last 30 days.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
