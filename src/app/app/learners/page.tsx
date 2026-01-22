'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { getLearnersAction } from '@/application/actions/learner.actions';
import { Learner, FundingType, LearnerStatus, ComplianceStatus } from '@/domain/entities/learner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GraduationCap, Search, Filter, Plus, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { RefreshCcw } from 'lucide-react';
import { syncEdofDossiersAction } from '@/application/actions/edof.actions';

export default function LearnersPage() {
    const { activeOrganization, isNexusMode, getActiveOrgIds } = useAuthStore();
    const router = useRouter();
    const [learners, setLearners] = useState<Learner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        loadLearners();
    }, [activeOrganization?.id, isNexusMode]);

    async function loadLearners() {
        const orgIds = getActiveOrgIds();
        if (orgIds.length === 0) return;

        setIsLoading(true);
        // Use consolidated action (accepts string or array)
        const res = await getLearnersAction(orgIds.length === 1 ? orgIds[0] : orgIds);

        if (res.success && res.learners) {
            setLearners(res.learners as unknown as Learner[]);
        }
        setIsLoading(false);
    }

    const filteredLearners = learners.filter(l =>
        l.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.lastName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <GraduationCap className="text-emerald-600" />
                        Mes Apprenants
                    </h1>
                    <p className="text-slate-500">Suivi administratif et pédagogique des dossiers validés.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="rounded-xl font-bold border-slate-200"
                        onClick={async () => {
                            if (!activeOrganization) return;
                            setIsSyncing(true);
                            const res = await syncEdofDossiersAction(activeOrganization.id);
                            if (res.success) {
                                alert(res.message);
                                loadLearners(); // Reload list
                            } else {
                                alert(res.error);
                            }
                            setIsSyncing(false);
                        }}
                        disabled={isSyncing}
                    >
                        <RefreshCcw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                        Synchroniser EDOF
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold">
                        <Plus size={16} className="mr-2" />
                        Nouvel Apprenant
                    </Button>
                </div>
            </header>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <Input
                        placeholder="Rechercher un apprenant..."
                        className="pl-10 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline"><Filter size={16} className="mr-2" /> Status</Button>
            </div>

            {/* List */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <span className="w-1/4">Apprenant</span>
                        {isNexusMode && <span className="w-1/6">Origine</span>}
                        <span className="w-1/6">Financement</span>
                        <span className="w-1/6">Statut Dossier</span>
                        <span className="w-1/6">Progression</span>
                        <span className="w-1/6 text-right">Actions</span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-400">Chargement...</div>
                    ) : filteredLearners.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-4">
                            <GraduationCap size={48} className="text-slate-200" />
                            <p>Aucun apprenant trouvé.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredLearners.map((learner: any) => {
                                const folder = learner.folders?.[0]; // Get most recent folder
                                return (
                                    <div
                                        key={learner.id}
                                        onClick={() => router.push(`/app/learners/${learner.id}`)}
                                        className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group"
                                    >
                                        <div className="w-1/4">
                                            <p className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                                                {learner.firstName} {learner.lastName}
                                            </p>
                                            <p className="text-xs text-slate-400">{learner.email}</p>
                                        </div>

                                        {isNexusMode && (
                                            <div className="w-1/6">
                                                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 truncate block max-w-[140px]">
                                                    {learner.organisation?.name || 'Inconnu'}
                                                </span>
                                            </div>
                                        )}

                                        <div className="w-1/6">
                                            {folder ? (
                                                <Badge variant="outline" className={`
                                                    ${folder.fundingType === FundingType.CPF ? 'border-purple-200 bg-purple-50 text-purple-700' : ''}
                                                    ${folder.fundingType === FundingType.PERSO ? 'border-blue-200 bg-blue-50 text-blue-700' : ''}
                                                    ${folder.fundingType === FundingType.POLE_EMPLOI ? 'border-orange-200 bg-orange-50 text-orange-700' : ''}
                                                `}>
                                                    {folder.fundingType}
                                                </Badge>
                                            ) : <span className="text-slate-400 text-sm">-</span>}
                                        </div>

                                        <div className="w-1/6">
                                            {folder ? (
                                                <div className="flex items-center gap-2">
                                                    {folder.complianceStatus === ComplianceStatus.VALID && <CheckCircle size={16} className="text-green-500" />}
                                                    {folder.complianceStatus === ComplianceStatus.PENDING && <FileText size={16} className="text-amber-500" />}
                                                    {folder.complianceStatus === ComplianceStatus.ALERT && <AlertTriangle size={16} className="text-red-500" />}

                                                    <span className={`text-sm font-medium
                                                        ${folder.complianceStatus === ComplianceStatus.VALID ? 'text-green-700' : ''}
                                                        ${folder.complianceStatus === ComplianceStatus.PENDING ? 'text-amber-700' : ''}
                                                        ${folder.complianceStatus === ComplianceStatus.ALERT ? 'text-red-700' : ''}
                                                    `}>
                                                        {folder.complianceStatus}
                                                    </span>
                                                </div>
                                            ) : <span className="text-slate-400 text-sm">Pas de dossier</span>}
                                        </div>

                                        <div className="w-1/6">
                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 w-[0%]"></div> {/* Placeholder */}
                                            </div>
                                            <span className="text-xs text-slate-400 mt-1 block">0% complété</span>
                                        </div>

                                        <div className="w-1/6 text-right">
                                            <Button variant="ghost" size="sm">Gérer</Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
