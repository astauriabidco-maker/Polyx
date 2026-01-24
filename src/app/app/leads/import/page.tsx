'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileUp, Check, AlertTriangle, ArrowRight, Save, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/application/store/auth-store';
import { importLeadsAction } from '@/application/actions/lead.actions';
import { toast } from 'sonner';

type ImportStep = 'UPLOAD' | 'MAPPING' | 'PREVIEW' | 'IMPORTING' | 'COMPLETED';

interface CSVRow {
    [key: string]: string;
}

const REQUIRED_FIELDS = [
    { key: 'email', label: 'Email', required: true },
    { key: 'firstName', label: 'Prénom', required: false },
    { key: 'lastName', label: 'Nom', required: false },
    { key: 'phone', label: 'Téléphone', required: false },
];

export default function LeadImportPage() {
    const router = useRouter();
    const { user, activeOrganization } = useAuthStore();
    const [step, setStep] = useState<ImportStep>('UPLOAD');
    const [file, setFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<CSVRow[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [campaignId, setCampaignId] = useState<string>('');
    const [stats, setStats] = useState<any>(null);

    // Default Mapping Guesser
    const guessMapping = (headers: string[]) => {
        const newMapping: Record<string, string> = {};
        headers.forEach(h => {
            const lower = h.toLowerCase();
            if (lower.includes('mail')) newMapping['email'] = h;
            else if (lower.includes('prénom') || lower.includes('firstname') || lower === 'prenom') newMapping['firstName'] = h;
            else if (lower.includes('nom') || lower.includes('lastname')) newMapping['lastName'] = h;
            else if (lower.includes('tél') || lower.includes('phone') || lower.includes('mobile')) newMapping['phone'] = h;
        });
        setMapping(newMapping);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFile(file);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data as CSVRow[];
                if (data.length > 0) {
                    const headers = Object.keys(data[0]);
                    setHeaders(headers);
                    setCsvData(data);
                    guessMapping(headers);
                    setStep('MAPPING');
                } else {
                    toast.error('Fichier vide ou invalide');
                }
            },
            error: (err) => {
                toast.error('Erreur de lecture CSV: ' + err.message);
            }
        });
    };

    const handleImport = async () => {
        if (!activeOrganization?.id) return;

        setStep('IMPORTING');
        const result = await importLeadsAction(csvData, activeOrganization.id, {
            ...mapping,
            campaignId
        });

        if (result.success) {
            setStats(result.stats);
            setStep('COMPLETED');
            toast.success('Import terminé !');
        } else {
            setStep('MAPPING');
            toast.error(result.error);
        }
    };

    return (
        <div className="container mx-auto max-w-4xl py-10 px-4">
            <div className="mb-8">
                <Button variant="ghost" onClick={() => router.push('/app/leads')} className="mb-4 pl-0 hover:bg-transparent hover:text-indigo-600 transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour au Pipeline
                </Button>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Import de Leads</h1>
                <p className="text-slate-500">Ajoutez massivement des prospects via fichier CSV</p>
            </div>

            {/* Stepper */}
            <div className="flex justify-between mb-8 relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10" />
                {['Upload', 'Mapping', 'Import'].map((label, idx) => {
                    const stepIdx = ['UPLOAD', 'MAPPING', 'IMPORTING', 'COMPLETED'].indexOf(step);
                    const isCompleted = stepIdx > idx;
                    const isCurrent = (step === 'UPLOAD' && idx === 0) || (step === 'MAPPING' && idx === 1) || ((step === 'IMPORTING' || step === 'COMPLETED') && idx === 2);

                    return (
                        <div key={label} className="flex flex-col items-center gap-2 bg-white px-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors
                                ${isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' :
                                    isCurrent ? 'border-indigo-600 text-indigo-600 bg-white' :
                                        'border-slate-200 text-slate-400 bg-white'}`}>
                                {isCompleted ? <Check size={14} /> : idx + 1}
                            </div>
                            <span className={`text-xs font-medium ${isCurrent ? 'text-indigo-600' : 'text-slate-500'}`}>{label}</span>
                        </div>
                    );
                })}
            </div>

            {step === 'UPLOAD' && (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="p-4 rounded-full bg-slate-50 mb-4">
                            <Upload className="h-10 w-10 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Glissez votre fichier CSV ici</h3>
                        <p className="text-sm text-slate-500 mb-6 max-w-sm">ou cliquez pour parcourir vos fichiers (.csv, .xlsx). Le fichier doit contenir une ligne d'en-tête.</p>
                        <Input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            id="file-upload"
                            onChange={handleFileUpload}
                        />
                        <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                            Choisir un fichier
                        </Button>
                    </CardContent>
                </Card>
            )}

            {step === 'MAPPING' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Association des colonnes</CardTitle>
                            <CardDescription>{csvData.length} lignes détectées. Associez vos colonnes CSV aux champs CRM.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                {REQUIRED_FIELDS.map((field) => (
                                    <div key={field.key} className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-1">
                                            {field.label}
                                            {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <Select
                                            value={mapping[field.key] || ''}
                                            onValueChange={(val) => setMapping(prev => ({ ...prev, [field.key]: val }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner une colonne..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {headers.map(h => (
                                                    <SelectItem key={h} value={h}>{h}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-slate-500 truncate">
                                            Exemple: {csvData[0][mapping[field.key]] || '—'}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t">
                                <label className="text-sm font-medium">Campagne (Optionnel)</label>
                                <Input
                                    className="mt-1.5"
                                    placeholder="Ex: Campagne Été 2026"
                                    value={campaignId}
                                    onChange={(e) => setCampaignId(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => { setStep('UPLOAD'); setFile(null); }}>Annuler</Button>
                        <Button
                            onClick={handleImport}
                            disabled={!mapping['email']} // Basic validation
                        >
                            Lancer l'import
                            <ArrowRight size={16} className="ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 'IMPORTING' && (
                <Card>
                    <CardContent className="py-20 flex flex-col items-center text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-6"></div>
                        <h3 className="text-lg font-semibold mb-2">Importation en cours...</h3>
                        <p className="text-slate-500">Veuillez ne pas fermer cette page.</p>
                    </CardContent>
                </Card>
            )}

            {step === 'COMPLETED' && stats && (
                <div className="space-y-6">
                    <Card className="border-green-100 bg-green-50/50">
                        <CardContent className="py-10 text-center">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                                <Check size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-green-900 mb-2">Import Réussi !</h2>
                            <div className="flex justify-center gap-8 mt-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-slate-900">{stats.imported}</div>
                                    <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">Traités</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-amber-600">{stats.duplicates}</div>
                                    <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">Doublons</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                                    <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">Erreurs</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="flex justify-center">
                        <Button onClick={() => router.push('/app/leads')}>
                            Retour aux Leads
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
