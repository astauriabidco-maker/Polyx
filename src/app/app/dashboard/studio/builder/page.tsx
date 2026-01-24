'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Sparkles, Plus, Trash2, Clock, BookOpen, Eye, Type, Settings2, CheckCircle2, XCircle, FileCheck, Volume2, Activity, AlertTriangle, Link2, Database, ListChecks, RefreshCw, FileUp } from 'lucide-react';
import { generateContentWithAI } from '@/application/actions/ai-factory';
import { getQuestionsByFilterAction } from '@/application/actions/question-bank.actions';
import { createThemeAction, getThemesAction } from '@/application/actions/theme.actions';
import { getReviewQueueAction, approveQuestionAction, rejectQuestionAction } from '@/application/actions/qa.actions';
import { generateQuestionAudioAction } from '@/application/actions/audio.actions';
import { getTrainingsCompactAction } from '@/application/actions/training.actions';
import { useAuthStore } from '@/application/store/auth-store';
import { toast } from 'sonner';
import { SectionType, CefrLevel, QuestionType } from '@prisma/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuestionFormModal } from '@/components/studio/QuestionFormModal';
import { ImportQuestionsModal } from '@/components/studio/ImportQuestionsModal';

export default function TestBuilderPage() {
    const { user } = useAuthStore();

    // Test Config
    const [testName, setTestName] = useState('Nouveau Test');
    const [globalTime, setGlobalTime] = useState(60);
    const [targetTrainingId, setTargetTrainingId] = useState<string | null>(null);
    const [trainings, setTrainings] = useState<any[]>([]);

    const [sections, setSections] = useState<any[]>([
        { id: '1', type: 'READING', level: 'B2', count: 5, stock: 0 },
    ]);

    // Themes
    const [themes, setThemes] = useState<any[]>([]);
    const [showThemeManager, setShowThemeManager] = useState(false);
    const [newTheme, setNewTheme] = useState({ name: '', description: '', keyVocabulary: '', situations: '', styleNotes: '', trainingIds: [] as string[] });

    // Review Queue
    const [reviewQueue, setReviewQueue] = useState<any[]>([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState<string | null>(null);

    // AI Modal
    const [isGenerating, setIsGenerating] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiParams, setAiParams] = useState({ type: 'READING' as SectionType, questionType: 'MCQ' as QuestionType, level: 'B2' as CefrLevel, selectedThemeIds: [] as string[] });

    // Question Bank (All questions, filterable)
    const [allQuestions, setAllQuestions] = useState<any[]>([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [bankFilter, setBankFilter] = useState({ type: '', level: '' });

    // Create/Import Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    useEffect(() => {
        if (user?.organizationId) {
            refreshAll();
        }
    }, [user?.organizationId]);

    const refreshAll = async () => {
        if (!user?.organizationId) return;
        const [themesRes, queueRes, trainingsRes] = await Promise.all([
            getThemesAction(user.organizationId),
            getReviewQueueAction(user.organizationId),
            getTrainingsCompactAction(user.organizationId)
        ]);
        if (themesRes.success && themesRes.data) setThemes(themesRes.data);
        if (queueRes.success && queueRes.data) setReviewQueue(queueRes.data);
        if (trainingsRes.success && trainingsRes.data) setTrainings(trainingsRes.data);
    };

    const loadQuestions = async (type?: string, level?: string) => {
        if (!user?.organizationId) return;
        setIsLoadingQuestions(true);
        try {
            const res = await getQuestionsByFilterAction(
                user.organizationId,
                (type || undefined) as SectionType | undefined,
                (level || undefined) as CefrLevel | undefined
            );
            if (res.success && res.data) {
                setAllQuestions(res.data);
                // Update stock counts in sections
                const stockMap: Record<string, number> = {};
                res.data.forEach((q: any) => {
                    const key = `${q.sectionType}-${q.level}`;
                    stockMap[key] = (stockMap[key] || 0) + 1;
                });
                setSections(prev => prev.map(s => ({ ...s, stock: stockMap[`${s.type}-${s.level}`] || 0 })));
            }
        } catch (e) {
            toast.error("Erreur de chargement");
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    // Auto-Context when training changes
    useEffect(() => {
        if (targetTrainingId && targetTrainingId !== 'none') {
            const linkedThemes = themes.filter(t => t.trainings?.some((tr: any) => tr.id === targetTrainingId));
            if (linkedThemes.length > 0) {
                setAiParams(prev => ({
                    ...prev,
                    selectedThemeIds: linkedThemes.map(t => t.id)
                }));
                toast.info(`${linkedThemes.length} thème(s) auto-sélectionnés.`);
            }
        }
    }, [targetTrainingId, themes]);

    const addSection = () => setSections([...sections, { id: Date.now().toString(), type: 'GRAMMAR', level: 'B1', count: 5, stock: 0 }]);
    const removeSection = (id: string) => setSections(sections.filter(s => s.id !== id));

    const handleCreateTheme = async () => {
        if (!user?.organizationId || !newTheme.name) return toast.error("Nom requis");
        await createThemeAction(user.organizationId, {
            name: newTheme.name,
            description: newTheme.description,
            keyVocabulary: newTheme.keyVocabulary,
            situations: newTheme.situations,
            styleNotes: newTheme.styleNotes,
            trainingIds: newTheme.trainingIds
        });
        await refreshAll();
        setNewTheme({ name: '', description: '', keyVocabulary: '', situations: '', styleNotes: '', trainingIds: [] });
        toast.success("Thématique créée");
    };

    const handleGenerateAI = async () => {
        if (!user?.organizationId) return;
        if (aiParams.selectedThemeIds.length === 0) return toast.error("Sélectionnez une thématique");

        setIsGenerating(true);
        try {
            const res = await generateContentWithAI({
                sectionType: aiParams.type,
                questionType: aiParams.questionType,
                level: aiParams.level,
                themeIds: aiParams.selectedThemeIds,
                orgId: user.organizationId
            });
            if (res.success) {
                toast.success(`${res.count} brouillons générés !`);
                setShowAIModal(false);
                await refreshAll();
            } else {
                toast.error("Erreur: " + res.error);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateAudio = async (id: string) => {
        if (!user?.organizationId) return;
        setIsGeneratingAudio(id);
        try {
            const res = await generateQuestionAudioAction(id, user.organizationId);
            if (res.success && res.url) {
                toast.success("Audio généré !");
                setReviewQueue(prev => prev.map(q => q.id === id ? { ...q, audioUrl: res.url } : q));
            } else {
                toast.error("Erreur Audio");
            }
        } finally {
            setIsGeneratingAudio(null);
        }
    };

    const handleApprove = async (id: string) => {
        if (!user?.organizationId) return;
        await approveQuestionAction(id, user.organizationId);
        setReviewQueue(prev => prev.filter(q => q.id !== id));
        toast.success("Question validée");
    };

    const handleReject = async (id: string) => {
        if (!user?.organizationId) return;
        await rejectQuestionAction(id, user.organizationId);
        setReviewQueue(prev => prev.filter(q => q.id !== id));
        toast.info("Question rejetée");
    };

    const getReliabilityColor = (score: number) => score >= 90 ? 'text-green-500' : score >= 70 ? 'text-orange-500' : 'text-red-500';
    const getLevelColor = (level: string) => {
        const colors: Record<string, string> = {
            'A1': 'bg-emerald-100 text-emerald-800', 'A2': 'bg-green-100 text-green-800',
            'B1': 'bg-blue-100 text-blue-800', 'B2': 'bg-indigo-100 text-indigo-800',
            'C1': 'bg-purple-100 text-purple-800', 'C2': 'bg-rose-100 text-rose-800'
        };
        return colors[level] || 'bg-slate-100';
    };

    return (
        <div className="p-6 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Assessment Studio</h1>
                    <p className="text-slate-500 text-sm">Conception et gestion des tests d'évaluation</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={reviewQueue.length > 0 ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => setShowReviewModal(true)}
                        className="relative"
                    >
                        <FileCheck size={14} className="mr-1" /> Validation
                        {reviewQueue.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                                {reviewQueue.length}
                            </span>
                        )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowThemeManager(true)}>
                        <Settings2 size={14} className="mr-1" /> Thèmes
                    </Button>
                </div>
            </div>

            {/* Main Content with Tabs */}
            <Tabs defaultValue="builder" className="space-y-6">
                <TabsList className="bg-white border shadow-sm">
                    <TabsTrigger value="builder" className="gap-2">
                        <ListChecks size={14} /> Configuration Test
                    </TabsTrigger>
                    <TabsTrigger value="bank" className="gap-2" onClick={() => loadQuestions()}>
                        <Database size={14} /> Banque de Questions
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: Test Builder */}
                <TabsContent value="builder">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Left Sidebar: Config */}
                        <Card className="lg:col-span-1">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Paramètres</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">Nom du Test</Label>
                                    <Input value={testName} onChange={e => setTestName(e.target.value)} className="h-8" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                                        <Link2 size={10} /> Formation Cible
                                    </Label>
                                    <Select value={targetTrainingId || 'none'} onValueChange={setTargetTrainingId}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Aucune" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- Aucune --</SelectItem>
                                            {trainings.map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">Durée (min)</Label>
                                    <div className="flex items-center gap-2">
                                        <Clock size={12} className="text-slate-400" />
                                        <Input type="number" value={globalTime} onChange={e => setGlobalTime(parseInt(e.target.value))} className="h-8" />
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border text-xs">
                                    <div className="flex justify-between"><span>Sections</span><span className="font-bold">{sections.length}</span></div>
                                    <div className="flex justify-between mt-1"><span>Questions</span><span className="font-bold">{sections.reduce((a, s) => a + s.count, 0)}</span></div>
                                </div>
                                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-8 text-xs">
                                    Sauvegarder
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Right: Sections */}
                        <div className="lg:col-span-3 space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="font-semibold text-slate-800">Sections du Test</h2>
                                <Button variant="outline" size="sm" onClick={addSection}>
                                    <Plus size={14} className="mr-1" /> Section
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sections.map((section, idx) => (
                                    <Card key={section.id} className="group hover:shadow-md transition-shadow border-l-4 border-l-indigo-500">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                                                        {idx + 1}
                                                    </div>
                                                    <Select value={section.type} onValueChange={(v) => setSections(prev => prev.map(s => s.id === section.id ? { ...s, type: v } : s))}>
                                                        <SelectTrigger className="h-7 text-xs w-36 border-0 bg-slate-100"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="READING">📖 Compréhension écrite</SelectItem>
                                                            <SelectItem value="LISTENING">🎧 Compréhension orale</SelectItem>
                                                            <SelectItem value="WRITING">✍️ Expression écrite</SelectItem>
                                                            <SelectItem value="SPEAKING">🎤 Expression orale</SelectItem>
                                                            <SelectItem value="GRAMMAR">📝 Grammaire</SelectItem>
                                                            <SelectItem value="VOCABULARY">📚 Vocabulaire</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 text-red-500 h-6 w-6 p-0" onClick={() => removeSection(section.id)}>
                                                    <Trash2 size={12} />
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                <div className="space-y-1">
                                                    <span className="text-slate-400">Niveau</span>
                                                    <Select value={section.level} onValueChange={(v) => setSections(prev => prev.map(s => s.id === section.id ? { ...s, level: v } : s))}>
                                                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-slate-400">Tirage</span>
                                                    <Input type="number" className="h-7 text-xs" value={section.count} onChange={(e) => setSections(prev => prev.map(s => s.id === section.id ? { ...s, count: parseInt(e.target.value) || 0 } : s))} />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-slate-400">Stock</span>
                                                    <div className={`h-7 flex items-center justify-center rounded text-xs font-bold ${section.stock >= section.count ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {section.stock}
                                                    </div>
                                                </div>
                                            </div>

                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="w-full mt-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 h-7 text-xs"
                                                onClick={() => {
                                                    setAiParams({ type: section.type, level: section.level, selectedThemeIds: [] });
                                                    setShowAIModal(true);
                                                }}
                                            >
                                                <Sparkles size={12} className="mr-1" /> Générer IA
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* TAB 2: Question Bank */}
                <TabsContent value="bank">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-base">Banque de Questions</CardTitle>
                                    <CardDescription>Questions validées et en production</CardDescription>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowCreateModal(true)}>
                                        <Plus size={14} className="mr-1" /> Créer
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowImportModal(true)}>
                                        <FileUp size={14} className="mr-1" /> Importer
                                    </Button>
                                    <Select value={bankFilter.type} onValueChange={(v) => { setBankFilter(f => ({ ...f, type: v })); loadQuestions(v, bankFilter.level); }}>
                                        <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Tous Types</SelectItem>
                                            <SelectItem value="READING">📖 Compréhension écrite</SelectItem>
                                            <SelectItem value="LISTENING">🎧 Compréhension orale</SelectItem>
                                            <SelectItem value="WRITING">✍️ Expression écrite</SelectItem>
                                            <SelectItem value="SPEAKING">🎤 Expression orale</SelectItem>
                                            <SelectItem value="GRAMMAR">📝 Grammaire</SelectItem>
                                            <SelectItem value="VOCABULARY">📚 Vocabulaire</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={bankFilter.level} onValueChange={(v) => { setBankFilter(f => ({ ...f, level: v })); loadQuestions(bankFilter.type, v); }}>
                                        <SelectTrigger className="w-24 h-8 text-xs"><SelectValue placeholder="Niveau" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Tous</SelectItem>
                                            {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Button variant="ghost" size="sm" onClick={() => loadQuestions(bankFilter.type, bankFilter.level)}>
                                        <RefreshCw size={14} />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoadingQuestions ? (
                                <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto" /></div>
                            ) : allQuestions.length === 0 ? (
                                <div className="py-12 text-center text-slate-400">
                                    <Database size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>Aucune question. Utilisez l'IA pour en générer.</p>
                                </div>
                            ) : (
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50">
                                                <TableHead className="w-[50%]">Contenu</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Niveau</TableHead>
                                                <TableHead className="text-center">Fiabilité</TableHead>
                                                <TableHead className="text-center">Stats</TableHead>
                                                <TableHead className="text-center">Audio</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allQuestions.map(q => (
                                                <TableRow key={q.id} className={q.flaggedForReview ? 'bg-red-50' : ''}>
                                                    <TableCell className="font-medium text-sm max-w-xs truncate" title={q.content}>
                                                        {q.content}
                                                    </TableCell>
                                                    <TableCell><Badge variant="outline" className="text-xs">{q.sectionType}</Badge></TableCell>
                                                    <TableCell><Badge className={`${getLevelColor(q.level)} text-xs`}>{q.level}</Badge></TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Activity size={12} className={getReliabilityColor(q.reliabilityScore || 100)} />
                                                            <span className="text-xs font-bold">{(q.reliabilityScore || 100).toFixed(0)}%</span>
                                                            {q.flaggedForReview && <AlertTriangle size={12} className="text-red-500" />}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs text-slate-500">
                                                        {q.attempts > 0 ? `${((q.successCount / q.attempts) * 100).toFixed(0)}% (${q.attempts})` : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {q.audioUrl ? <Volume2 size={14} className="mx-auto text-indigo-500" /> : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* AI Generation Modal */}
            <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="text-indigo-500" size={18} />
                            Génération IA
                        </DialogTitle>
                        <DialogDescription>
                            {aiParams.type} - {aiParams.level}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Question Type Selector */}
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Type de Question</Label>
                            <Select value={aiParams.questionType} onValueChange={(v) => setAiParams(p => ({ ...p, questionType: v as QuestionType }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MCQ">☑️ QCM (Choix multiples)</SelectItem>
                                    <SelectItem value="BOOLEAN">✓✗ Vrai/Faux</SelectItem>
                                    <SelectItem value="GAP_FILL">📝 Texte à trous</SelectItem>
                                    <SelectItem value="SHORT_ANSWER">✏️ Réponse courte</SelectItem>
                                    <SelectItem value="MATCHING">🔗 Appariement</SelectItem>
                                    <SelectItem value="ORDERING">🔢 Réordonnancement</SelectItem>
                                    <SelectItem value="OPEN_TEXT">📄 Texte libre</SelectItem>
                                    <SelectItem value="AUDIO_DICTATION">🎧 Dictée audio</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Themes */}
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Thématiques</Label>
                            <div className="max-h-40 overflow-y-auto space-y-2 border p-2 rounded bg-slate-50">
                                {themes.length === 0 ? (
                                    <p className="text-sm text-slate-500 italic">Aucune thématique.</p>
                                ) : (
                                    themes.map(theme => (
                                        <div key={theme.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={theme.id}
                                                checked={aiParams.selectedThemeIds.includes(theme.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setAiParams(p => ({ ...p, selectedThemeIds: [...p.selectedThemeIds, theme.id] }))
                                                    else setAiParams(p => ({ ...p, selectedThemeIds: p.selectedThemeIds.filter(id => id !== theme.id) }))
                                                }}
                                            />
                                            <label htmlFor={theme.id} className="text-sm">{theme.name}</label>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAIModal(false)}>Annuler</Button>
                        <Button onClick={handleGenerateAI} disabled={isGenerating} className="bg-indigo-600 hover:bg-indigo-700">
                            {isGenerating && <Loader2 className="mr-2 animate-spin" size={14} />}
                            Générer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Review Queue Modal */}
            <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileCheck className="text-orange-500" size={18} />
                            Validation ({reviewQueue.length})
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        {reviewQueue.length === 0 ? (
                            <div className="py-8 text-center text-slate-400">
                                <CheckCircle2 className="mx-auto h-10 w-10 text-green-200 mb-2" />
                                <p>Tout est validé !</p>
                            </div>
                        ) : (
                            reviewQueue.map(q => (
                                <Card key={q.id} className="border-l-4 border-l-orange-400">
                                    <CardContent className="p-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">{q.sectionType}</Badge>
                                                <Badge className={`${getLevelColor(q.level)} text-xs`}>{q.level}</Badge>
                                            </div>
                                            <span className="text-xs font-bold text-orange-500">DRAFT</span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-900 mb-2">{q.content}</p>

                                        {q.sectionType === 'LISTENING' && q.audioScript && (
                                            <div className="mb-2 p-2 bg-indigo-50 rounded text-xs text-indigo-700">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold">Script:</span>
                                                    {!q.audioUrl ? (
                                                        <Button variant="outline" size="sm" className="h-5 text-xs" onClick={() => handleGenerateAudio(q.id)} disabled={isGeneratingAudio === q.id}>
                                                            {isGeneratingAudio === q.id ? <Loader2 size={10} className="animate-spin" /> : <Volume2 size={10} />}
                                                        </Button>
                                                    ) : (
                                                        <audio controls src={q.audioUrl} className="h-6 w-32" />
                                                    )}
                                                </div>
                                                <p className="italic">{q.audioScript}</p>
                                            </div>
                                        )}

                                        {q.choices && (
                                            <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                                                {(q.choices as any[]).map((c, i) => (
                                                    <div key={i} className={`p-1 rounded ${c.isCorrect ? 'bg-green-100 text-green-800 font-bold' : 'bg-slate-100'}`}>
                                                        {c.text}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-2 pt-2 border-t">
                                            <Button variant="ghost" size="sm" className="text-red-500 h-7 text-xs" onClick={() => handleReject(q.id)}>
                                                <XCircle size={12} className="mr-1" /> Rejeter
                                            </Button>
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" onClick={() => handleApprove(q.id)}>
                                                <CheckCircle2 size={12} className="mr-1" /> Valider
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Theme Manager Modal */}
            <Dialog open={showThemeManager} onOpenChange={setShowThemeManager}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Thématiques</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="Nom du thème *" value={newTheme.name} onChange={e => setNewTheme({ ...newTheme, name: e.target.value })} className="h-8 text-sm" />
                            <Input placeholder="Brève description" value={newTheme.description} onChange={e => setNewTheme({ ...newTheme, description: e.target.value })} className="h-8 text-sm" />
                        </div>

                        {/* Enriched Context Fields */}
                        <div className="space-y-2 border-t pt-3">
                            <Label className="text-xs text-slate-500 flex items-center gap-1">🔤 Vocabulaire clé (pour l'IA)</Label>
                            <Textarea
                                placeholder="aéroport, réservation, hébergement, billet, passeport..."
                                value={newTheme.keyVocabulary}
                                onChange={e => setNewTheme({ ...newTheme, keyVocabulary: e.target.value })}
                                className="text-sm min-h-[60px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500 flex items-center gap-1">💬 Situations types</Label>
                            <Textarea
                                placeholder="Réserver un hôtel, Demander des renseignements à l'office du tourisme, Se plaindre d'un service..."
                                value={newTheme.situations}
                                onChange={e => setNewTheme({ ...newTheme, situations: e.target.value })}
                                className="text-sm min-h-[60px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500 flex items-center gap-1">📝 Consignes de style</Label>
                            <Input
                                placeholder="Registre formel, contexte professionnel, tutoiement accepté..."
                                value={newTheme.styleNotes}
                                onChange={e => setNewTheme({ ...newTheme, styleNotes: e.target.value })}
                                className="h-8 text-sm"
                            />
                        </div>

                        <div>
                            <Label className="text-xs text-slate-500">Lier aux Formations</Label>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {trainings.map(t => (
                                    <Badge
                                        key={t.id}
                                        variant={newTheme.trainingIds.includes(t.id) ? "secondary" : "outline"}
                                        className="cursor-pointer text-xs"
                                        onClick={() => {
                                            if (newTheme.trainingIds.includes(t.id)) {
                                                setNewTheme(n => ({ ...n, trainingIds: n.trainingIds.filter(id => id !== t.id) }))
                                            } else {
                                                setNewTheme(n => ({ ...n, trainingIds: [...n.trainingIds, t.id] }))
                                            }
                                        }}
                                    >
                                        {t.title}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <Button className="w-full h-8 text-sm" onClick={handleCreateTheme}>
                            <Plus size={14} className="mr-1" /> Créer
                        </Button>
                        <div className="border-t pt-3 space-y-2 max-h-40 overflow-y-auto">
                            {themes.map(t => (
                                <div key={t.id} className="flex justify-between items-center bg-slate-50 p-2 rounded text-sm">
                                    <span className="font-medium">{t.name}</span>
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Question Modal */}
            <QuestionFormModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                orgId={user?.organizationId || ''}
                onSuccess={() => loadQuestions(bankFilter.type, bankFilter.level)}
            />

            {/* Import Questions Modal */}
            <ImportQuestionsModal
                open={showImportModal}
                onOpenChange={setShowImportModal}
                orgId={user?.organizationId || ''}
                onSuccess={() => loadQuestions(bankFilter.type, bankFilter.level)}
            />
        </div>
    );
}
