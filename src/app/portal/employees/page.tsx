'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Search, UserPlus, FileDown, MoreHorizontal,
    Clock, CheckCircle2, TrendingUp, Download
} from 'lucide-react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function EmployeesPage() {
    // Mock data - In production this comes from getClientEmployeesAction
    const employees = [
        { id: "1", name: "Jean Dupont", email: "jean.dupont@acme.com", training: "Anglais Business B2", progress: 65, status: "IN_TRAINING", lastActive: "2026-01-05" },
        { id: "2", name: "Marie Curie", email: "marie.curie@acme.com", training: "Management d'Équipe", progress: 100, status: "COMPLETED", lastActive: "2025-12-20" },
        { id: "3", name: "Albert Einstein", email: "albert@acme.com", training: "Physique Avancée", progress: 12, status: "IN_TRAINING", lastActive: "2026-01-02" },
        { id: "4", name: "Sophie Germain", email: "sophie@acme.com", training: "-", progress: 0, status: "ONBOARDING", lastActive: "2026-01-06" },
    ];

    const [searchTerm, setSearchTerm] = useState("");

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">Terminé</Badge>;
            case 'IN_TRAINING': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">En Cours</Badge>;
            case 'ONBOARDING': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">Inscription</Badge>;
            default: return <Badge variant="outline">Inactif</Badge>;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Mes Collaborateurs</h1>
                    <p className="text-slate-500">Gérez les inscriptions et suivez l'avancement de vos équipes.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" className="gap-2">
                        <FileDown size={16} /> Export Excel
                    </Button>
                    <Button className="bg-indigo-600 gap-2">
                        <UserPlus size={16} /> Nouvelle Inscription
                    </Button>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <Input
                            placeholder="Rechercher par nom, email..."
                            className="pl-9 bg-white border-slate-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-slate-50/50">
                                <TableHead className="w-[300px]">Collaborateur</TableHead>
                                <TableHead>Formation Actuelle</TableHead>
                                <TableHead>Progression</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees.map((employee) => (
                                <TableRow key={employee.id} className="hover:bg-slate-50 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-sm">
                                                {employee.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{employee.name}</div>
                                                <div className="text-xs text-slate-500">{employee.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-700">
                                        {employee.training}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${employee.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${employee.progress}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600">{employee.progress}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(employee.status)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200">
                                                    <MoreHorizontal size={16} className="text-slate-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Documents</DropdownMenuLabel>
                                                <DropdownMenuItem className="gap-2">
                                                    <Download size={14} /> Attestation d'assiduité
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="gap-2">
                                                    <Download size={14} /> Certificat de réalisation
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="gap-2 text-red-600">
                                                    Annuler l'inscription
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
