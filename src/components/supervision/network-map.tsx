'use client';

import { OrgStats } from '@/application/actions/network.actions';

// Mock Coordinates for France-ish shape (0-100 scale)
// Paris is roughly 50, 25
// Lyon is roughly 65, 60
// Bordeaux is roughly 30, 65
// Marseille is roughly 70, 85
const MOCK_COORDS: Record<string, { x: number; y: number }> = {
    'demo-org': { x: 50, y: 30 }, // Paris
    'sec-org-id': { x: 65, y: 60 }, // Lyon
};

export function NetworkMap({ organizations }: { organizations: OrgStats[] }) {
    return (
        <div className="relative w-full h-[400px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />

            {/* France Silhouette (Abstract SVG) */}
            <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M 40 10 L 60 10 L 80 40 L 70 80 L 30 80 L 20 50 Z" fill="currentColor" className="text-indigo-500" />
            </svg>

            {/* Organization Nodes */}
            {organizations.map((org) => {
                const coords = MOCK_COORDS[org.id] || { x: 50, y: 50 }; // Default center if unknown
                const healthColor = org.healthScore > 80 ? 'bg-green-500' : (org.healthScore > 50 ? 'bg-yellow-500' : 'bg-red-500');

                return (
                    <div
                        key={org.id}
                        className="absolute flex flex-col items-center group cursor-pointer transition-all duration-500 hover:scale-110"
                        style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                    >
                        {/* Pulse Effect */}
                        <div className={`absolute w-12 h-12 rounded-full ${healthColor} opacity-20 animate-ping gap-4`} />

                        {/* Dot */}
                        <div className={`relative w-4 h-4 rounded-full ${healthColor} border-2 border-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.5)]`} />

                        {/* Label (Tooltip on hover) */}
                        <div className="absolute top-6 px-3 py-1.5 bg-slate-800 text-slate-200 text-xs rounded-md border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xl pointer-events-none">
                            <div className="font-bold">{org.name}</div>
                            <div className="text-[10px] text-slate-400">Leads: {org.leadCount} | Santé: {org.healthScore}%</div>
                        </div>
                    </div>
                );
            })}

            <div className="absolute bottom-4 left-4 text-xs text-slate-500 font-mono">
                LIVE NETWORK STATUS
            </div>
        </div>
    );
}
