'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Lead, LeadStatus, LeadSource, CallOutcome, RefusalReason } from '@/domain/entities/lead';
import { Button } from '@/components/ui/button';

// Mock Disqualified Data
const MOCK_ARCHIVES: Lead[] = [
    {
        id: '101', organizationId: 'demo-org',
        firstName: 'Jean', lastName: 'Dupont', email: 'jean.d@test.com', phone: '0600000000',
        source: LeadSource.FACEBOOK, status: LeadStatus.DISQUALIFIED,
        score: 20, callAttempts: 1, history: [
            { type: 'CALL_LOG', timestamp: new Date(), userId: 'u1', details: { outcome: CallOutcome.REFUSAL, data: { refusalReason: RefusalReason.PRICE } } }
        ],
        createdAt: new Date(), updatedAt: new Date()
    },
    {
        id: '102', organizationId: 'demo-org',
        firstName: 'Paul', lastName: 'Durand', email: 'paul.d@test.com', phone: '0600000001',
        source: LeadSource.GOOGLE_ADS, status: LeadStatus.DISQUALIFIED,
        score: 40, callAttempts: 2, history: [
            { type: 'CALL_LOG', timestamp: new Date(), userId: 'u1', details: { outcome: CallOutcome.REFUSAL, data: { refusalReason: RefusalReason.COMPETITION } } }
        ],
        createdAt: new Date(), updatedAt: new Date()
    },
    {
        id: '103', organizationId: 'demo-org',
        firstName: 'Marc', lastName: 'Lavoine', email: 'marc.l@test.com', phone: '0600000002',
        source: LeadSource.WEBSITE, status: LeadStatus.DISQUALIFIED,
        score: 10, callAttempts: 3, history: [
            { type: 'CALL_LOG', timestamp: new Date(), userId: 'u1', details: { outcome: CallOutcome.REFUSAL, data: { refusalReason: RefusalReason.NO_PROJECT } } }
        ],
        createdAt: new Date(), updatedAt: new Date()
    }
];

export default function ArchivesPage() {
    const [leads, setLeads] = useState<Lead[]>([]);

    useEffect(() => {
        setLeads(MOCK_ARCHIVES);
    }, []);

    // Filter helpers
    const getByReason = (reason: RefusalReason) => {
        return leads.filter(l => {
            // Naive check: look for last CALL_LOG with refusal
            const lastLog = [...l.history].reverse().find(h => h.type === 'CALL_LOG' && h.details?.outcome === CallOutcome.REFUSAL);
            return lastLog?.details?.data?.refusalReason === reason;
        });
    };

    const reasons = [
        { id: RefusalReason.PRICE, label: 'Trop Cher (Price)', color: 'text-red-600 bg-red-50 border-red-100' },
        { id: RefusalReason.COMPETITION, label: 'Concurrence', color: 'text-orange-600 bg-orange-50 border-orange-100' },
        { id: RefusalReason.NO_PROJECT, label: 'Pas de Projet', color: 'text-slate-600 bg-slate-50 border-slate-100' },
        { id: RefusalReason.OTHER, label: 'Autre / Injoignable', color: 'text-gray-600 bg-gray-50 border-gray-100' },
    ];

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Archives & Disqualification Analysis</h1>
                    <p className="text-slate-500">Analyze why leads are lost to improve sales pitch.</p>
                </div>
                <Button variant="outline">Export CSV</Button>
            </div>

            <div className="grid grid-cols-4 gap-6">
                {reasons.map(reason => (
                    <div key={reason.id} className="flex flex-col h-full bg-white rounded-xl border border-slate-200">
                        <div className={`p-4 border-b border-slate-100 font-semibold flex justify-between ${reason.color}`}>
                            <span>{reason.label}</span>
                            <span className="bg-white/50 px-2 rounded text-sm">{getByReason(reason.id).length}</span>
                        </div>
                        <div className="p-4 space-y-3 flex-1 bg-slate-50/50">
                            {getByReason(reason.id).map(lead => (
                                <Card key={lead.id} className="p-3 shadow-none border hover:shadow-sm">
                                    <div className="font-medium text-sm text-slate-900">{lead.firstName} {lead.lastName}</div>
                                    <div className="text-xs text-slate-500 mt-1">{lead.email}</div>
                                    <div className="mt-2 text-[10px] text-slate-400 uppercase tracking-wide">{lead.source}</div>
                                </Card>
                            ))}
                            {getByReason(reason.id).length === 0 && (
                                <div className="text-center text-slate-400 text-sm py-8 italic">No data</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
