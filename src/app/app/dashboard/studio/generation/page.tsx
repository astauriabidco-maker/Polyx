'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, CheckCircle2, XCircle, Volume2 } from 'lucide-react';
import { useAuthStore } from '@/application/store/auth-store';
import { getThemesAction } from '@/application/actions/theme.actions';
import { generateContentWithAI } from '@/application/actions/ai-factory';
import { getReviewQueueAction, approveQuestionAction, rejectQuestionAction } from '@/application/actions/qa.actions';
import { generateQuestionAudioAction } from '@/application/actions/audio.actions';
import { toast } from 'sonner';
import { SectionType, CefrLevel, QuestionType } from '@prisma/client';

const LEVEL_COLORS: Record<string, string> = {
    A1: 'bg-emerald-100 text-emerald-800', A2: 'bg-green-100 text-green-800',
    B1: 'bg-blue-100 text-blue-800', B2: 'bg-indigo-100 text-indigo-800',
    C1: 'bg-purple-100 text-purple-800', C2: 'bg-rose-100 text-rose-800',
};

export default function GenerationPage() {
    const { user } = useAuthStore();
    const [themes, setThemes] = useState<any[]>([]);
    const [reviewQueue, setReviewQueue] = useState<any[]>([]);

    // Generation params
    const [isGenerating, setIsGenerating] = useState(false);
    const [params, setParams] = useState({
        sectionType: 'READING' as SectionType,
        questionType: 'MCQ' as QuestionType,
        level: 'B2' as CefrLevel,
        selectedThemeIds: [] as string[],
    });

    const [isGeneratingAudio, setIsGeneratingAudio] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organizationId) {
            loadData();
        }
    }, [user?.organizationId]);

    const loadData = async () => {
        if (!user?.organizationId) return;
        const [themesRes, queueRes] = await Promise.all([
            getThemesAction(user.organizationId),
            getReviewQueueAction(user.organizationId),
        ]);
        if (themesRes.success) setThemes(themesRes.data || []);
        if (queueRes.success) setReviewQueue(queueRes.data || []);
    };

    const handleGenerate = async () => {
        if (!user?.organizationId || params.selectedThemeIds.length === 0) {
            return toast.error('Sélectionnez au moins une thématique');
        }
        setIsGenerating(true);
        try {
            const res = await generateContentWithAI({
                ...params,
                themeIds: params.selectedThemeIds,
                orgId: user.organizationId,
            });
            if (res.success) {
                toast.success(`${res.count} brouillons générés !`);
                loadData();
            } else {
                toast.error('Erreur: ' + res.error);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (!user?.organizationId) return;
        await approveQuestionAction(id, user.organizationId);
        setReviewQueue(prev => prev.filter(q => q.id !== id));
        toast.success('Question validée');
    };

    const handleReject = async (id: string) => {
        if (!user?.organizationId) return;
        await rejectQuestionAction(id, user.organizationId);
        setReviewQueue(prev => prev.filter(q => q.id !== id));
        toast.info('Question rejetée');
    };

    const handleGenerateAudio = async (id: string) => {
        if (!user?.organizationId) return;
        setIsGeneratingAudio(id);
        try {
            const res = await generateQuestionAudioAction(id, user.organizationId);
            if (res.success && res.url) {
                toast.success('Audio généré !');
                setReviewQueue(prev => prev.map(q => q.id === id ? { ...q, audioUrl: res.url } : q));
            }
        } finally {
            setIsGeneratingAudio(null);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Génération IA</h1>
                    <p className="text-slate-500 text-sm">Créez des questions automatiquement</p>
                </div>
                {reviewQueue.length > 0 && (
                    <Badge variant="destructive" className="text-sm">
                        {reviewQueue.length} en attente
                    </Badge>
                )}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Left: Generation Panel */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="text-indigo-500" size={18} />
                            Paramètres
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Section</Label>
                                <Select value={params.sectionType} onValueChange={v => setParams({ ...params, sectionType: v as SectionType })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="READING">📖 Lecture</SelectItem>
                                        <SelectItem value="LISTENING">🎧 Écoute</SelectItem>
                                        <SelectItem value="GRAMMAR">📝 Grammaire</SelectItem>
                                        <SelectItem value="VOCABULARY">📚 Vocabulaire</SelectItem>
                                        <SelectItem value="WRITING">✍️ Expression écrite</SelectItem>
                                        <SelectItem value="SPEAKING">🎤 Expression orale</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Niveau</Label>
                                <Select value={params.level} onValueChange={v => setParams({ ...params, level: v as CefrLevel })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
                                            <SelectItem key={l} value={l}>{l}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Type de question</Label>
                            <Select value={params.questionType} onValueChange={v => setParams({ ...params, questionType: v as QuestionType })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MCQ">☑️ QCM</SelectItem>
                                    <SelectItem value="BOOLEAN">✓✗ Vrai/Faux</SelectItem>
                                    <SelectItem value="GAP_FILL">📝 Texte à trous</SelectItem>
                                    <SelectItem value="SHORT_ANSWER">✏️ Réponse courte</SelectItem>
                                    <SelectItem value="MATCHING">🔗 Appariement</SelectItem>
                                    <SelectItem value="ORDERING">🔢 Réordonnancement</SelectItem>
                                    <SelectItem value="OPEN_TEXT">📄 Texte libre</SelectItem>
                                    <SelectItem value="AUDIO_DICTATION">🎧 Dictée</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Thématiques</Label>
                            <div className="max-h-40 overflow-y-auto space-y-2 border rounded p-2 bg-slate-50">
                                {themes.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">Aucune thématique. Créez-en depuis l'onglet Thématiques.</p>
                                ) : (
                                    themes.map(t => (
                                        <div key={t.id} className="flex items-center gap-2">
                                            <Checkbox
                                                id={t.id}
                                                checked={params.selectedThemeIds.includes(t.id)}
                                                onCheckedChange={checked => {
                                                    if (checked) setParams(p => ({ ...p, selectedThemeIds: [...p.selectedThemeIds, t.id] }));
                                                    else setParams(p => ({ ...p, selectedThemeIds: p.selectedThemeIds.filter(id => id !== t.id) }));
                                                }}
                                            />
                                            <label htmlFor={t.id} className="text-sm cursor-pointer">{t.name}</label>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <Button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-indigo-600 hover:bg-indigo-700">
                            {isGenerating ? <Loader2 className="mr-2 animate-spin" size={14} /> : <Sparkles className="mr-2" size={14} />}
                            Générer
                        </Button>
                    </CardContent>
                </Card>

                {/* Right: Review Queue */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="text-orange-500" size={18} />
                            File de validation ({reviewQueue.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-[450px] overflow-y-auto">
                        {reviewQueue.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <CheckCircle2 className="mx-auto mb-2 text-green-200" size={32} />
                                <p className="text-sm">Aucune question en attente</p>
                            </div>
                        ) : (
                            reviewQueue.map(q => (
                                <Card key={q.id} className="border-l-4 border-l-orange-400">
                                    <CardContent className="p-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">{q.sectionType}</Badge>
                                                <Badge className={`${LEVEL_COLORS[q.level]} text-xs`}>{q.level}</Badge>
                                            </div>
                                            <Badge variant="secondary" className="text-xs">DRAFT</Badge>
                                        </div>
                                        <p className="text-sm font-medium text-slate-800 mb-2 line-clamp-2">{q.content}</p>

                                        {q.sectionType === 'LISTENING' && q.audioScript && (
                                            <div className="mb-2 p-2 bg-indigo-50 rounded text-xs">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold text-indigo-700">Script:</span>
                                                    {!q.audioUrl ? (
                                                        <Button variant="outline" size="sm" className="h-5 text-xs" onClick={() => handleGenerateAudio(q.id)} disabled={isGeneratingAudio === q.id}>
                                                            {isGeneratingAudio === q.id ? <Loader2 size={10} className="animate-spin" /> : <Volume2 size={10} />}
                                                        </Button>
                                                    ) : (
                                                        <audio controls src={q.audioUrl} className="h-6 w-32" />
                                                    )}
                                                </div>
                                                <p className="italic text-indigo-600">{q.audioScript}</p>
                                            </div>
                                        )}

                                        {q.choices && Array.isArray(q.choices) && q.choices.length > 0 && (
                                            <div className="grid grid-cols-2 gap-1 mb-2">
                                                {q.choices.map((c: any, i: number) => (
                                                    <div key={i} className={`text-xs p-1 rounded ${c.isCorrect ? 'bg-green-100 text-green-800 font-bold' : 'bg-slate-100'}`}>
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
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
