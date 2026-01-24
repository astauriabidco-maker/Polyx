'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Link2, Save, FileCheck } from 'lucide-react';
import { useAuthStore } from '@/application/store/auth-store';
import { getTrainingsCompactAction } from '@/application/actions/training.actions';
import { toast } from 'sonner';

interface TestSection {
    id: string;
    type: string;
    level: string;
    count: number;
}

export default function TestsPage() {
    const { user } = useAuthStore();
    const [trainings, setTrainings] = useState<any[]>([]);

    // Test Configuration State
    const [testName, setTestName] = useState('Nouveau Test');
    const [targetTrainingId, setTargetTrainingId] = useState<string | null>(null);
    const [testDuration, setTestDuration] = useState(45);
    const [sections, setSections] = useState<TestSection[]>([
        { id: '1', type: 'READING', level: 'B1', count: 5 },
        { id: '2', type: 'LISTENING', level: 'B1', count: 5 },
        { id: '3', type: 'GRAMMAR', level: 'B1', count: 10 },
    ]);

    useEffect(() => {
        if (user?.organizationId) {
            loadTrainings();
        }
    }, [user?.organizationId]);

    const loadTrainings = async () => {
        if (!user?.organizationId) return;
        const res = await getTrainingsCompactAction(user.organizationId);
        if (res.success) setTrainings(res.data || []);
    };

    const addSection = () => {
        setSections([...sections, { id: Date.now().toString(), type: 'GRAMMAR', level: 'B1', count: 5 }]);
    };

    const removeSection = (id: string) => {
        setSections(sections.filter(s => s.id !== id));
    };

    const updateSection = (id: string, field: keyof TestSection, value: any) => {
        setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const totalQuestions = sections.reduce((sum, s) => sum + s.count, 0);

    const handleSaveTemplate = () => {
        toast.success('Template enregistré (fonctionnalité à venir)');
    };

    return (
        <div className="p-6 max-w-4xl">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Configuration des Tests</h1>
                    <p className="text-slate-500 text-sm">Créez et gérez vos templates d'évaluation</p>
                </div>
                <Button onClick={handleSaveTemplate} className="bg-indigo-600 hover:bg-indigo-700">
                    <Save size={14} className="mr-2" />
                    Enregistrer Template
                </Button>
            </div>

            <div className="grid gap-6">
                {/* Test Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Informations générales</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Nom du Test</Label>
                                <Input value={testName} onChange={e => setTestName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Durée (minutes)</Label>
                                <Input type="number" value={testDuration} onChange={e => setTestDuration(parseInt(e.target.value) || 0)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500 flex items-center gap-1">
                                <Link2 size={10} /> Formation Cible
                            </Label>
                            <Select value={targetTrainingId || 'none'} onValueChange={setTargetTrainingId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Aucune" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Aucune</SelectItem>
                                    {trainings.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Sections */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-base">Sections du Test</CardTitle>
                            <Badge variant="secondary">{totalQuestions} questions</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {sections.map((section, idx) => (
                            <div key={section.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                    {idx + 1}
                                </div>
                                <Select value={section.type} onValueChange={v => updateSection(section.id, 'type', v)}>
                                    <SelectTrigger className="w-44">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="READING">📖 Compréhension écrite</SelectItem>
                                        <SelectItem value="LISTENING">🎧 Compréhension orale</SelectItem>
                                        <SelectItem value="WRITING">✍️ Expression écrite</SelectItem>
                                        <SelectItem value="SPEAKING">🎤 Expression orale</SelectItem>
                                        <SelectItem value="GRAMMAR">📝 Grammaire</SelectItem>
                                        <SelectItem value="VOCABULARY">📚 Vocabulaire</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={section.level} onValueChange={v => updateSection(section.id, 'level', v)}>
                                    <SelectTrigger className="w-20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
                                            <SelectItem key={l} value={l}>{l}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs text-slate-400">Tirage:</Label>
                                    <Input
                                        type="number"
                                        className="w-16 h-8"
                                        value={section.count}
                                        onChange={e => updateSection(section.id, 'count', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 ml-auto"
                                    onClick={() => removeSection(section.id)}
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" onClick={addSection} className="w-full">
                            <Plus size={14} className="mr-2" /> Ajouter une section
                        </Button>
                    </CardContent>
                </Card>

                {/* Summary */}
                <Card className="bg-indigo-50 border-indigo-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <FileCheck className="text-indigo-500" size={24} />
                            <div>
                                <div className="font-medium text-indigo-900">{testName}</div>
                                <div className="text-sm text-indigo-600">
                                    {sections.length} sections • {totalQuestions} questions • {testDuration} min
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
