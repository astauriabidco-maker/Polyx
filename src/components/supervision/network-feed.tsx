'use client';

import { Activity, Phone, UserPlus, CheckCircle } from 'lucide-react';

const MOCK_ACTIVITIES = [
    { id: 1, type: 'SALE', org: 'Polyx Lyon', text: 'Vente validée: Formation Full Stack', time: '2 min ago', value: '1500€' },
    { id: 2, type: 'CALL', org: 'Polyx Paris', text: 'Appel sortant: Kevin D.', time: '5 min ago' },
    { id: 3, type: 'LEAD', org: 'Polyx Bordeaux', text: 'Nouveau lead: Sarah M.', time: '12 min ago' },
    { id: 4, type: 'SALE', org: 'Polyx Paris', text: 'Vente validée: Formation Anglais', time: '15 min ago', value: '1200€' },
    { id: 5, type: 'CALL', org: 'Polyx Lyon', text: 'Rappel programmé: Thomas L.', time: '22 min ago' },
];

export function NetworkFeed() {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-[400px] overflow-hidden flex flex-col">
            <h3 className="text-slate-100 font-bold mb-4 flex items-center gap-2">
                <Activity size={18} className="text-indigo-500" />
                Fil d'Activité Réseau
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {MOCK_ACTIVITIES.map((activity) => (
                    <div key={activity.id} className="flex gap-3 items-start p-3 rounded-lg bg-slate-950/50 border border-slate-800/50 hover:bg-slate-800 transition-colors">
                        <div className={`mt-1 p-1.5 rounded-full ${activity.type === 'SALE' ? 'bg-green-500/20 text-green-500' :
                                activity.type === 'LEAD' ? 'bg-blue-500/10 text-blue-500' :
                                    'bg-slate-500/10 text-slate-500'
                            }`}>
                            {activity.type === 'SALE' ? <CheckCircle size={14} /> :
                                activity.type === 'LEAD' ? <UserPlus size={14} /> :
                                    <Phone size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-semibold text-indigo-400">{activity.org}</span>
                                <span className="text-[10px] text-slate-500">{activity.time}</span>
                            </div>
                            <p className="text-sm text-slate-300 font-medium truncate">{activity.text}</p>
                            {activity.value && <div className="text-xs font-mono text-green-400 mt-1">+{activity.value}</div>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
