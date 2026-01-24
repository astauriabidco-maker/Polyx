'use client';

import { useState } from 'react';
import { AssessmentSession } from '@prisma/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface AssessmentWithLead extends AssessmentSession {
    lead: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
    };
}

interface AssessmentTableProps {
    initialData: AssessmentWithLead[];
    onFilterChange: (filters: any) => void;
    isLoading?: boolean;
}

export function AssessmentTable({ initialData, onFilterChange, isLoading }: AssessmentTableProps) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [levelFilter, setLevelFilter] = useState('ALL');

    // Debounced search could be better, but basic for now
    const handleSearch = (val: string) => {
        setSearch(val);
        onFilterChange({ search: val, status: statusFilter, level: levelFilter });
    };

    const handleStatus = (val: string) => {
        setStatusFilter(val);
        onFilterChange({ search, status: val, level: levelFilter });
    };

    const handleLevel = (val: string) => {
        setLevelFilter(val);
        onFilterChange({ search, status: statusFilter, level: val });
    };

    return (
        <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Rechercher un candidat..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <Select value={statusFilter} onValueChange={handleStatus}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tout statut</SelectItem>
                        <SelectItem value="PENDING">En attente</SelectItem>
                        <SelectItem value="COMPLETED">Terminé</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={levelFilter} onValueChange={handleLevel}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Niveau Cible" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tout niveau</SelectItem>
                        <SelectItem value="A1">A1</SelectItem>
                        <SelectItem value="A2">A2 (Nationalité)</SelectItem>
                        <SelectItem value="B1">B1 (Naturalisation)</SelectItem>
                        <SelectItem value="B2">B2 (Pro)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[100px]">Date</TableHead>
                            <TableHead>Candidat</TableHead>
                            <TableHead>Objectif</TableHead>
                            <TableHead>Résultat</TableHead>
                            <TableHead>Prescription</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                                </TableCell>
                            </TableRow>
                        ) : initialData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                    Aucun résultat trouvé.
                                </TableCell>
                            </TableRow>
                        ) : (
                            initialData.map((item) => (
                                <TableRow key={item.id} className="hover:bg-slate-50/50">
                                    <TableCell className="font-medium text-slate-600">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/app/leads/${item.leadId}`} className="font-semibold text-indigo-600 hover:underline">
                                            {item.lead.firstName} {item.lead.lastName}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-slate-500 font-normal">
                                            {item.targetLevel}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {item.status === 'PENDING' ? (
                                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
                                                En attente
                                            </Badge>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                                    {item.resultLevel || 'N/A'}
                                                </Badge>
                                                <span className="text-xs font-bold text-slate-600">{item.score}%</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {item.status === 'COMPLETED' ? (
                                            <span className="font-bold text-slate-900">{item.recommendedHours || 0} h</span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {item.status === 'COMPLETED' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => window.open(`/api/assessment/${item.token}/pdf`, '_blank')}
                                            >
                                                <FileText className="h-4 w-4 text-slate-500 hover:text-indigo-600" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
