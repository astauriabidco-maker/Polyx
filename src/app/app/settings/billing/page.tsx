'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getFranchiseBillingSummaryAction } from '@/application/actions/billing.actions';
import {
    DollarSign, Download, Calendar, ArrowRight, TrendingUp,
    ChevronLeft, ChevronRight, FileText, PieChart
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function BillingManagementPage() {
    const { activeOrganization } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);
    const [billingData, setBillingData] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        if (activeOrganization) {
            loadBillingData();
        }
    }, [activeOrganization, selectedDate]);

    async function loadBillingData() {
        setIsLoading(true);
        const res = await getFranchiseBillingSummaryAction(
            activeOrganization!.id,
            selectedDate.getMonth(),
            selectedDate.getFullYear()
        );
        if (res.success && res.billingData) {
            setBillingData(res.billingData);
        }
        setIsLoading(false);
    }

    const nextMonth = () => {
        setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)));
    };

    const prevMonth = () => {
        setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)));
    };

    const totalTurnover = billingData.reduce((sum, item) => sum + item.turnoverHt, 0);
    const totalToInvoice = billingData.reduce((sum, item) => sum + item.totalToInvoice, 0);
    const totalLeads = billingData.reduce((sum, item) => sum + item.leadCount, 0);
    const totalExams = billingData.reduce((sum, item) => sum + item.examsAmount, 0);

    const handleExportCSV = () => {
        if (billingData.length === 0) return;

        const headers = ["Franchise", "SIRET", "Leads", "Montant Leads (€)", "Chiffre Affaires (€)", "Royalties (%)", "Montant Royalties (€)", "Examens", "Montant Examens (€)", "Total à Facturer (€)"];
        const rows = billingData.map(item => [
            item.franchiseName,
            item.siret || '',
            item.leadCount,
            item.leadsAmount.toFixed(2),
            item.turnoverHt.toFixed(2),
            item.royaltyRate,
            item.royaltiesAmount.toFixed(2),
            item.examsCount,
            item.examsAmount.toFixed(2),
            item.totalToInvoice.toFixed(2)
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Facturation_Franchises_${format(selectedDate, 'MM_yyyy')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Monthly Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 capitalize italic">
                            {format(selectedDate, 'MMMM yyyy', { locale: fr })}
                        </h2>
                        <p className="text-sm text-slate-500">Période de facturation des redevances</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <Button variant="ghost" size="sm" onClick={prevMonth} className="h-9 w-9 hover:bg-white rounded-lg p-0">
                            <ChevronLeft size={18} />
                        </Button>
                        <div className="px-4 font-bold text-sm text-slate-600 min-w-[120px] text-center">
                            Changer de mois
                        </div>
                        <Button variant="ghost" size="sm" onClick={nextMonth} className="h-9 w-9 hover:bg-white rounded-lg p-0">
                            <ChevronRight size={18} />
                        </Button>
                    </div>
                    <Button
                        onClick={handleExportCSV}
                        className="bg-slate-900 hover:bg-slate-800 h-11 px-6 font-bold flex items-center gap-2"
                        disabled={billingData.length === 0}
                    >
                        <Download size={18} /> Exporter .CSV
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border shadow-none">
                    <CardContent className="p-6">
                        <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">CA Réseau Global</p>
                        <div className="flex items-end gap-2">
                            <p className="text-3xl font-black text-slate-900">{totalTurnover.toLocaleString()}€</p>
                            <Badge className="mb-1 bg-emerald-50 text-emerald-600 border-emerald-100">+12%</Badge>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border shadow-none">
                    <CardContent className="p-6">
                        <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">Total Leads Transférés</p>
                        <div className="flex items-end gap-2">
                            <p className="text-3xl font-black text-slate-900">{totalLeads}</p>
                            <div className="h-8 w-16 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mb-1">
                                <TrendingUp size={16} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border shadow-none">
                    <CardContent className="p-6">
                        <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">Frais Examens (CCI)</p>
                        <div className="flex items-end gap-2">
                            <p className="text-3xl font-black text-slate-900">{totalExams.toLocaleString()}€</p>
                            <Badge className="mb-1 bg-blue-50 text-blue-600 border-blue-100">Réseau</Badge>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-emerald-200 bg-emerald-50/20 shadow-none">
                    <CardContent className="p-6">
                        <p className="text-sm font-bold text-emerald-700 mb-1 uppercase tracking-wider">Total à Facturer</p>
                        <p className="text-3xl font-black text-emerald-600">{totalToInvoice.toLocaleString()}€</p>
                        <p className="text-[10px] text-emerald-500/80 mt-1 font-bold">Montant HT Global</p>
                    </CardContent>
                </Card>
                <Card className="border shadow-none bg-slate-900 text-white">
                    <CardContent className="p-6">
                        <p className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">Taux de Collecte</p>
                        <p className="text-3xl font-black">98.5%</p>
                        <div className="h-1 bg-slate-700 w-full rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-emerald-400 w-[98.5%] shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table Area */}
            <Card className="border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50">
                <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between py-6">
                    <div>
                        <CardTitle className="text-xl font-black text-slate-900">Synthèse de Facturation par Franchise</CardTitle>
                        <p className="text-sm text-slate-500">Détail des montants calculés par entité pour la période sélectionnée.</p>
                    </div>
                    <Badge variant="outline" className="bg-slate-50">
                        {billingData.length} entités calculées
                    </Badge>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <div className="h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                            <p className="font-bold">Calcul des redevances en cours...</p>
                        </div>
                    ) : billingData.length > 0 ? (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Structure Philiale / Franchise</th>
                                    <th className="px-6 py-4">Leads</th>
                                    <th className="px-6 py-4">Examens</th>
                                    <th className="px-6 py-4">CA & Royalties</th>
                                    <th className="px-6 py-4 text-right">Net à Facturer (HT)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-medium">
                                {billingData.map((item) => (
                                    <tr key={item.franchiseId} className="hover:bg-slate-50/30 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-black group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    {item.franchiseName.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-slate-900 font-bold">{item.franchiseName}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{item.siret}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-slate-900 font-bold">{item.leadCount} leads</span>
                                                <span className="text-[10px] text-slate-400">x {item.leadPrice}€/u = {item.leadsAmount.toLocaleString()}€</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-slate-900 font-bold">{item.examsCount} cand.</span>
                                                <span className="text-[10px] text-slate-400">{item.examsAmount.toLocaleString()}€</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-900 font-black">{item.turnoverHt.toLocaleString()}€</span>
                                                    <span className="text-emerald-600 font-black text-xs">{item.royaltyRate}%</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400">Roy.: {item.royaltiesAmount.toLocaleString()}€</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <span className="text-xl font-black text-slate-900">{item.totalToInvoice.toLocaleString()}€</span>
                                            <p className="text-[10px] text-slate-400 uppercase font-black mt-0.5">HT</p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <PieChart size={48} className="mb-4 opacity-20" />
                            <p className="font-bold">Aucune donnée de facturation pour cette période.</p>
                            <p className="text-sm">Assurez-vous que des franchises sont actives et ont généré du flux.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Footer Alert */}
            <div className="bg-indigo-600 rounded-3xl p-6 text-white flex items-center justify-between shadow-xl shadow-indigo-100">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-inner">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-lg italic">Prêt pour l'émission des factures ?</h4>
                        <p className="text-indigo-100 text-sm">Les montants incluent les redevances fixes et variables paramétrées dans les contrats.</p>
                    </div>
                </div>
                <Button className="bg-white text-indigo-600 hover:bg-indigo-50 font-black px-8">
                    Générer les documents <ArrowRight size={18} className="ml-2" />
                </Button>
            </div>
        </div>
    );
}
