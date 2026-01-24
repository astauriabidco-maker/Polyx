'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { importQuestionsAction, getImportTemplateAction, ImportRow } from '@/application/actions/question-crud.actions';
import { toast } from 'sonner';

interface ImportQuestionsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string;
    onSuccess?: () => void;
}

export function ImportQuestionsModal({ open, onOpenChange, orgId, onSuccess }: ImportQuestionsModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
    const [parseErrors, setParseErrors] = useState<string[]>([]);
    const [importResult, setImportResult] = useState<{ imported: number; errors: { row: number; error: string }[] } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDownloadTemplate = async () => {
        setIsLoading(true);
        try {
            const result = await getImportTemplateAction();
            if (result.success && result.csv) {
                const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'questions_template.csv';
                link.click();
                URL.revokeObjectURL(url);
                toast.success('Template téléchargé');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            parseCSV(text);
        };
        reader.readAsText(file);
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            setParseErrors(['Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données']);
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const requiredHeaders = ['sectionType', 'level', 'content'];

        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            setParseErrors([`Colonnes manquantes: ${missingHeaders.join(', ')}`]);
            return;
        }

        const rows: ImportRow[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
            try {
                // Handle CSV with quoted fields
                const values = parseCSVLine(lines[i]);

                if (values.length < headers.length) {
                    errors.push(`Ligne ${i + 1}: Nombre de colonnes incorrect`);
                    continue;
                }

                const row: any = {};
                headers.forEach((header, idx) => {
                    let value = values[idx]?.trim() || '';
                    // Convert numeric fields
                    if (['correctIndex', 'minWords', 'duration'].includes(header) && value) {
                        row[header] = parseInt(value) || 0;
                    } else {
                        row[header] = value || undefined;
                    }
                });

                // Validate required fields
                if (!row.sectionType || !row.level || !row.content) {
                    errors.push(`Ligne ${i + 1}: sectionType, level et content sont requis`);
                    continue;
                }

                rows.push(row as ImportRow);
            } catch (err) {
                errors.push(`Ligne ${i + 1}: Erreur de parsing`);
            }
        }

        setParsedRows(rows);
        setParseErrors(errors);
        setImportResult(null);
    };

    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);

        return result.map(s => s.replace(/^"|"$/g, ''));
    };

    const handleImport = async () => {
        if (parsedRows.length === 0) {
            toast.error('Aucune donnée à importer');
            return;
        }

        setIsImporting(true);
        try {
            const result = await importQuestionsAction(orgId, parsedRows);

            if (result.success) {
                setImportResult({
                    imported: result.imported || 0,
                    errors: result.errors || []
                });

                if (result.imported && result.imported > 0) {
                    toast.success(`${result.imported} question(s) importée(s)`);
                    onSuccess?.();
                }
            } else {
                toast.error(result.error || 'Erreur d\'import');
            }
        } finally {
            setIsImporting(false);
        }
    };

    const resetState = () => {
        setParsedRows([]);
        setParseErrors([]);
        setImportResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const getSectionLabel = (type: string) => {
        const labels: Record<string, string> = {
            'READING': '📖 Compréhension écrite',
            'LISTENING': '🎧 Compréhension orale',
            'WRITING': '✍️ Expression écrite',
            'SPEAKING': '🎤 Expression orale',
            'GRAMMAR': '📝 Grammaire',
            'VOCABULARY': '📚 Vocabulaire',
        };
        return labels[type] || type;
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="text-green-500" size={18} />
                        Importer des Questions
                    </DialogTitle>
                    <DialogDescription>
                        Importez des questions en masse depuis un fichier CSV
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Step 1: Download Template */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                        <div>
                            <p className="font-medium">1. Télécharger le template</p>
                            <p className="text-sm text-slate-500">Fichier CSV avec les colonnes requises et exemples</p>
                        </div>
                        <Button variant="outline" onClick={handleDownloadTemplate} disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin mr-2" size={14} /> : <Download size={14} className="mr-2" />}
                            Template CSV
                        </Button>
                    </div>

                    {/* Step 2: Upload File */}
                    <div className="p-4 bg-slate-50 rounded-lg border">
                        <p className="font-medium mb-2">2. Importer votre fichier</p>
                        <div className="flex items-center gap-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.txt"
                                onChange={handleFileSelect}
                                className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                        </div>
                    </div>

                    {/* Parse Errors */}
                    {parseErrors.length > 0 && (
                        <Alert variant="destructive">
                            <AlertTriangle size={16} />
                            <AlertDescription>
                                <ul className="list-disc list-inside">
                                    {parseErrors.map((err, idx) => (
                                        <li key={idx}>{err}</li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Preview Table */}
                    {parsedRows.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <p className="font-medium">3. Prévisualisation ({parsedRows.length} lignes)</p>
                                <Badge variant="outline" className="text-green-600">
                                    <CheckCircle2 size={12} className="mr-1" /> Prêt à importer
                                </Badge>
                            </div>
                            <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-100">
                                            <TableHead className="w-12">#</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Niveau</TableHead>
                                            <TableHead>Contenu</TableHead>
                                            <TableHead>Sous-section</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedRows.slice(0, 10).map((row, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="text-slate-400">{idx + 1}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {getSectionLabel(row.sectionType)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="bg-indigo-100 text-indigo-800">{row.level}</Badge>
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate" title={row.content}>
                                                    {row.content}
                                                </TableCell>
                                                <TableCell>{row.subSection || '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {parsedRows.length > 10 && (
                                <p className="text-xs text-slate-500 text-center">
                                    ... et {parsedRows.length - 10} autres lignes
                                </p>
                            )}
                        </div>
                    )}

                    {/* Import Result */}
                    {importResult && (
                        <Alert className={importResult.errors.length > 0 ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
                            <CheckCircle2 size={16} className="text-green-600" />
                            <AlertDescription>
                                <p className="font-medium">{importResult.imported} question(s) importée(s) avec succès</p>
                                {importResult.errors.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-sm text-orange-700">{importResult.errors.length} erreur(s):</p>
                                        <ul className="list-disc list-inside text-xs text-orange-600">
                                            {importResult.errors.slice(0, 5).map((err, idx) => (
                                                <li key={idx}>Ligne {err.row}: {err.error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => { onOpenChange(false); resetState(); }}>
                        Fermer
                    </Button>
                    {parsedRows.length > 0 && !importResult && (
                        <Button
                            onClick={handleImport}
                            disabled={isImporting}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isImporting && <Loader2 className="mr-2 animate-spin" size={14} />}
                            <Upload size={14} className="mr-2" />
                            Importer {parsedRows.length} question(s)
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
