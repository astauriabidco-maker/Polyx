'use client';

import { useState, useEffect } from 'react';
import { Lead, LeadStatus, SalesStage } from '@/domain/entities/lead';
import ProspectionDashboard from '@/components/sales/prospection-dashboard';
import { useAuthStore } from '@/application/store/auth-store';
import { getLeadsAction } from '@/application/actions/lead.actions';
import { hydrateLeads } from '@/application/lib/date-utils';

export default function SalesPage() {
    const { activeOrganization, activeAgency } = useAuthStore();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (activeOrganization?.id) {
            loadLeads();
        }
    }, [activeOrganization?.id, activeAgency?.id]);

    const loadLeads = async () => {
        if (!activeOrganization?.id) return;
        setIsLoading(true);

        const res = await getLeadsAction(activeOrganization.id, false, activeAgency?.id);
        if (res.success && res.leads) {
            // Filter for prospection leads
            // Exclude:
            // - QUALIFIED (Legacy CRM)
            // - RDV_FIXE (CRM)
            // - PROSPECT + NOUVEAU (New Fresh CRM)
            // - ARCHIVED
            const prospectionLeads = res.leads.filter(l =>
                l.status !== LeadStatus.QUALIFIED &&
                l.status !== LeadStatus.RDV_FIXE &&
                l.status !== LeadStatus.ARCHIVED
            );
            setLeads(hydrateLeads(prospectionLeads) as Lead[]);
        }
        setIsLoading(false);
    };

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Chargement des leads...</div>;
    }

    return <ProspectionDashboard initialLeads={leads} />;
}
