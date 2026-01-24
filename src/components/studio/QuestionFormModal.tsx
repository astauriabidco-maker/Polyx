'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, GripVertical, HelpCircle } from 'lucide-react';
import { createQuestionAction, updateQuestionAction, QuestionInput } from '@/application/actions/question-crud.actions';
import { toast } from 'sonner';
import { CefrLevel, SectionType, QuestionType } from '@prisma/client';

interface QuestionFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string;
    editData?: any;
    onSuccess?: () => void;
}

const SECTION_TYPES = [
    { value: 'READING', label: '📖 Compréhension écrite' },
    { value: 'LISTENING', label: '🎧 Compréhension orale' },
    { value: 'WRITING', label: '✍️ Expression écrite' },
    { value: 'SPEAKING', label: '🎤 Expression orale' },
    { value: 'GRAMMAR', label: '📝 Grammaire' },
    { value: 'VOCABULARY', label: '📚 Vocabulaire' },
];

const QUESTION_TYPES = [
    { value: 'MCQ', label: '☑️ QCM (Choix multiples)', description: 'Plusieurs choix, une bonne réponse' },
    { value: 'BOOLEAN', label: '✓✗ Vrai/Faux', description: 'Question binaire' },
    { value: 'GAP_FILL', label: '📝 Texte à trous', description: 'Compléter les espaces vides' },
    { value: 'SHORT_ANSWER', label: '✏️ Réponse courte', description: 'Un mot ou une phrase' },
    { value: 'MATCHING', label: '🔗 Appariement', description: 'Relier les éléments' },
    { value: 'ORDERING', label: '🔢 Réordonnancement', description: 'Remettre dans l\'ordre' },
    { value: 'OPEN_TEXT', label: '📄 Texte libre', description: 'Rédaction longue' },
    { value: 'AUDIO_DICTATION', label: '🎧 Dictée audio', description: 'Écouter et écrire' },
];

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function QuestionFormModal({ open, onOpenChange, orgId, editData, onSuccess }: QuestionFormModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Form state
    const [sectionType, setSectionType] = useState<SectionType>('READING');
    const [questionType, setQuestionType] = useState<QuestionType>('MCQ');
    const [level, setLevel] = useState<CefrLevel>('B1');
    const [content, setContent] = useState('');
    const [subSection, setSubSection] = useState<'A' | 'B' | ''>('');

    // MCQ/Boolean choices
    const [choices, setChoices] = useState<{ text: string; isCorrect: boolean }[]>([
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
    ]);

    // Gap fill / Short answer
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [gapText, setGapText] = useState(''); // Text with ___ for gaps

    // Matching pairs
    const [matchingPairs, setMatchingPairs] = useState<{ left: string; right: string }[]>([
        { left: '', right: '' },
        { left: '', right: '' },
        { left: '', right: '' },
    ]);

    // Ordering items
    const [orderingItems, setOrderingItems] = useState<string[]>(['', '', '', '']);

    // Reading/Listening specific
    const [passageText, setPassageText] = useState('');
    const [audioScript, setAudioScript] = useState('');

    // Expression specific
    const [minWords, setMinWords] = useState<number>(40);
    const [duration, setDuration] = useState<number>(5);
    const [objectives, setObjectives] = useState('');

    const [tags, setTags] = useState('');

    // Initialize form when editing
    useEffect(() => {
        if (editData) {
            setSectionType(editData.sectionType);
            setQuestionType(editData.questionType || 'MCQ');
            setLevel(editData.level);
            setContent(editData.content);
            setSubSection(editData.subSection || '');
            if (editData.choices && Array.isArray(editData.choices)) {
                setChoices(editData.choices);
            }
            setPassageText(editData.passageText || '');
            setAudioScript(editData.audioScript || '');
            setMinWords(editData.minWords || 40);
            setDuration(editData.duration || 5);
            setObjectives(editData.objectives?.join('; ') || '');
            setTags(editData.tags || '');
        } else {
            resetForm();
        }
    }, [editData, open]);

    const resetForm = () => {
        setSectionType('READING');
        setQuestionType('MCQ');
        setLevel('B1');
        setContent('');
        setSubSection('');
        setChoices([
            { text: '', isCorrect: true },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
        ]);
        setCorrectAnswer('');
        setGapText('');
        setMatchingPairs([{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }]);
        setOrderingItems(['', '', '', '']);
        setPassageText('');
        setAudioScript('');
        setMinWords(40);
        setDuration(5);
        setObjectives('');
        setTags('');
    };

    const isExpressionSection = ['WRITING', 'SPEAKING'].includes(sectionType);

    // Dynamic add/remove functions
    const addChoice = () => {
        if (choices.length < 6) {
            setChoices([...choices, { text: '', isCorrect: false }]);
        }
    };

    const removeChoice = (index: number) => {
        if (choices.length > 2) {
            const newChoices = choices.filter((_, i) => i !== index);
            if (!newChoices.some(c => c.isCorrect)) newChoices[0].isCorrect = true;
            setChoices(newChoices);
        }
    };

    const updateChoice = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
        const newChoices = [...choices];
        if (field === 'isCorrect' && value === true) {
            newChoices.forEach((c, i) => c.isCorrect = i === index);
        } else if (field === 'text') {
            newChoices[index].text = value as string;
        } else {
            newChoices[index].isCorrect = value as boolean;
        }
        setChoices(newChoices);
    };

    const addMatchingPair = () => {
        if (matchingPairs.length < 8) {
            setMatchingPairs([...matchingPairs, { left: '', right: '' }]);
        }
    };

    const removeMatchingPair = (index: number) => {
        if (matchingPairs.length > 2) {
            setMatchingPairs(matchingPairs.filter((_, i) => i !== index));
        }
    };

    const updateMatchingPair = (index: number, side: 'left' | 'right', value: string) => {
        const newPairs = [...matchingPairs];
        newPairs[index][side] = value;
        setMatchingPairs(newPairs);
    };

    const addOrderingItem = () => {
        if (orderingItems.length < 8) {
            setOrderingItems([...orderingItems, '']);
        }
    };

    const removeOrderingItem = (index: number) => {
        if (orderingItems.length > 2) {
            setOrderingItems(orderingItems.filter((_, i) => i !== index));
        }
    };

    const updateOrderingItem = (index: number, value: string) => {
        const newItems = [...orderingItems];
        newItems[index] = value;
        setOrderingItems(newItems);
    };

    const handleSubmit = async () => {
        if (!content.trim()) {
            toast.error('Le contenu est requis');
            return;
        }

        setIsLoading(true);

        // Build choices based on question type
        let finalChoices: any = undefined;

        if (questionType === 'MCQ') {
            finalChoices = choices.filter(c => c.text.trim());
            if (finalChoices.length < 2) {
                toast.error('Au moins 2 choix sont requis pour un QCM');
                setIsLoading(false);
                return;
            }
        } else if (questionType === 'BOOLEAN') {
            finalChoices = [
                { text: 'Vrai', isCorrect: choices[0]?.isCorrect ?? true },
                { text: 'Faux', isCorrect: !choices[0]?.isCorrect }
            ];
        } else if (questionType === 'MATCHING') {
            finalChoices = matchingPairs.filter(p => p.left.trim() && p.right.trim());
        } else if (questionType === 'ORDERING') {
            finalChoices = orderingItems.filter(i => i.trim()).map((item, idx) => ({ text: item, order: idx }));
        } else if (questionType === 'GAP_FILL' || questionType === 'SHORT_ANSWER') {
            finalChoices = [{ text: correctAnswer, isCorrect: true }];
        }

        const input: QuestionInput = {
            sectionType,
            level,
            content,
            questionType,
            choices: finalChoices,
            passageText: sectionType === 'READING' ? passageText : (questionType === 'GAP_FILL' ? gapText : undefined),
            audioScript: sectionType === 'LISTENING' || questionType === 'AUDIO_DICTATION' ? audioScript : undefined,
            subSection: isExpressionSection && subSection ? subSection as 'A' | 'B' : undefined,
            promptText: isExpressionSection ? content : undefined,
            minWords: sectionType === 'WRITING' ? minWords : undefined,
            duration: sectionType === 'SPEAKING' ? duration : undefined,
            objectives: isExpressionSection && objectives ? objectives.split(';').map(o => o.trim()) : undefined,
            tags: tags || undefined,
        };

        try {
            const result = editData
                ? await updateQuestionAction(editData.id, orgId, input)
                : await createQuestionAction(orgId, input);

            if (result.success) {
                toast.success(editData ? 'Question modifiée' : 'Question créée');
                onOpenChange(false);
                resetForm();
                onSuccess?.();
            } else {
                toast.error(result.error || 'Erreur');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const getTypeInfo = QUESTION_TYPES.find(t => t.value === questionType);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus size={18} className="text-indigo-500" />
                        {editData ? 'Modifier la Question' : 'Nouvelle Question'}
                    </DialogTitle>
                    <DialogDescription>
                        Créez une question avec le format de votre choix
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Section Type & Level */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Section</Label>
                            <Select value={sectionType} onValueChange={(v) => setSectionType(v as SectionType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {SECTION_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Niveau CECRL</Label>
                            <Select value={level} onValueChange={(v) => setLevel(v as CefrLevel)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {LEVELS.map(l => (
                                        <SelectItem key={l} value={l}>{l}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Question Type Selector */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            Type de Question
                            <Badge variant="outline" className="text-xs font-normal">
                                {getTypeInfo?.description}
                            </Badge>
                        </Label>
                        <Select value={questionType} onValueChange={(v) => setQuestionType(v as QuestionType)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {QUESTION_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Sub-section for Expression types */}
                    {isExpressionSection && (
                        <div className="space-y-2">
                            <Label>Sous-section</Label>
                            <div className="flex gap-2">
                                <Button type="button" variant={subSection === 'A' ? 'secondary' : 'outline'} size="sm" onClick={() => setSubSection('A')}>
                                    Section A
                                </Button>
                                <Button type="button" variant={subSection === 'B' ? 'secondary' : 'outline'} size="sm" onClick={() => setSubSection('B')}>
                                    Section B
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Content / Question */}
                    <div className="space-y-2">
                        <Label>{isExpressionSection ? 'Consigne / Sujet' : 'Question'}</Label>
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={isExpressionSection ? "Décrivez le sujet de l'épreuve..." : "Entrez la question..."}
                            rows={3}
                        />
                    </div>

                    {/* Passage Text for Reading */}
                    {sectionType === 'READING' && (
                        <div className="space-y-2">
                            <Label>Texte de lecture (passage)</Label>
                            <Textarea value={passageText} onChange={(e) => setPassageText(e.target.value)} placeholder="Le texte que l'apprenant doit lire..." rows={4} />
                        </div>
                    )}

                    {/* Audio Script for Listening / Audio Dictation */}
                    {(sectionType === 'LISTENING' || questionType === 'AUDIO_DICTATION') && (
                        <div className="space-y-2">
                            <Label>Script audio</Label>
                            <Textarea value={audioScript} onChange={(e) => setAudioScript(e.target.value)} placeholder="Speaker A: ... Speaker B: ..." rows={4} />
                        </div>
                    )}

                    {/* MCQ Choices */}
                    {questionType === 'MCQ' && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label>Choix de réponses</Label>
                                <Button variant="ghost" size="sm" onClick={addChoice} disabled={choices.length >= 6}>
                                    <Plus size={14} className="mr-1" /> Ajouter
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {choices.map((choice, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <Checkbox checked={choice.isCorrect} onCheckedChange={(checked) => updateChoice(idx, 'isCorrect', checked)} />
                                        <Input value={choice.text} onChange={(e) => updateChoice(idx, 'text', e.target.value)} placeholder={`Choix ${String.fromCharCode(65 + idx)}`} className={`flex-1 ${choice.isCorrect ? 'border-green-500 bg-green-50' : ''}`} />
                                        <Button variant="ghost" size="sm" onClick={() => removeChoice(idx)} disabled={choices.length <= 2} className="text-red-500"><Trash2 size={14} /></Button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500">✓ Cochez la réponse correcte</p>
                        </div>
                    )}

                    {/* Boolean (Vrai/Faux) */}
                    {questionType === 'BOOLEAN' && (
                        <div className="space-y-2">
                            <Label>Réponse correcte</Label>
                            <div className="flex gap-4">
                                <Button type="button" variant={choices[0]?.isCorrect ? 'secondary' : 'outline'} onClick={() => setChoices([{ text: 'Vrai', isCorrect: true }, { text: 'Faux', isCorrect: false }])}>
                                    ✓ Vrai
                                </Button>
                                <Button type="button" variant={!choices[0]?.isCorrect ? 'secondary' : 'outline'} onClick={() => setChoices([{ text: 'Vrai', isCorrect: false }, { text: 'Faux', isCorrect: true }])}>
                                    ✗ Faux
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Gap Fill */}
                    {questionType === 'GAP_FILL' && (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label>Texte avec trous (utilisez ___ pour les espaces)</Label>
                                <Textarea value={gapText} onChange={(e) => setGapText(e.target.value)} placeholder="Le chat ___ sur le tapis. (dort)" rows={3} />
                            </div>
                            <div className="space-y-2">
                                <Label>Réponse(s) correcte(s) (séparées par ;)</Label>
                                <Input value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} placeholder="dort ; sommeille" />
                            </div>
                        </div>
                    )}

                    {/* Short Answer */}
                    {questionType === 'SHORT_ANSWER' && (
                        <div className="space-y-2">
                            <Label>Réponse attendue</Label>
                            <Input value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} placeholder="La réponse correcte" />
                            <p className="text-xs text-slate-500">Accepte les variantes orthographiques proches</p>
                        </div>
                    )}

                    {/* Matching */}
                    {questionType === 'MATCHING' && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label>Paires à associer</Label>
                                <Button variant="ghost" size="sm" onClick={addMatchingPair} disabled={matchingPairs.length >= 8}>
                                    <Plus size={14} className="mr-1" /> Ajouter
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {matchingPairs.map((pair, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <Input value={pair.left} onChange={(e) => updateMatchingPair(idx, 'left', e.target.value)} placeholder="Élément gauche" className="flex-1" />
                                        <span className="text-slate-400">↔</span>
                                        <Input value={pair.right} onChange={(e) => updateMatchingPair(idx, 'right', e.target.value)} placeholder="Élément droit" className="flex-1" />
                                        <Button variant="ghost" size="sm" onClick={() => removeMatchingPair(idx)} disabled={matchingPairs.length <= 2} className="text-red-500"><Trash2 size={14} /></Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Ordering */}
                    {questionType === 'ORDERING' && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label>Éléments dans l'ordre correct</Label>
                                <Button variant="ghost" size="sm" onClick={addOrderingItem} disabled={orderingItems.length >= 8}>
                                    <Plus size={14} className="mr-1" /> Ajouter
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {orderingItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-slate-400 w-6">{idx + 1}.</span>
                                        <Input value={item} onChange={(e) => updateOrderingItem(idx, e.target.value)} placeholder={`Élément ${idx + 1}`} className="flex-1" />
                                        <Button variant="ghost" size="sm" onClick={() => removeOrderingItem(idx)} disabled={orderingItems.length <= 2} className="text-red-500"><Trash2 size={14} /></Button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500">Entrez les éléments dans l'ordre correct. Ils seront mélangés pour l'apprenant.</p>
                        </div>
                    )}

                    {/* Expression specific fields */}
                    {isExpressionSection && (
                        <div className="grid grid-cols-2 gap-4">
                            {sectionType === 'WRITING' && (
                                <div className="space-y-2">
                                    <Label>Nombre de mots minimum</Label>
                                    <Input type="number" value={minWords} onChange={(e) => setMinWords(parseInt(e.target.value) || 0)} />
                                </div>
                            )}
                            {sectionType === 'SPEAKING' && (
                                <div className="space-y-2">
                                    <Label>Durée (minutes)</Label>
                                    <Input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} />
                                </div>
                            )}
                            <div className="space-y-2 col-span-2">
                                <Label>Objectifs (séparés par ;)</Label>
                                <Input value={objectives} onChange={(e) => setObjectives(e.target.value)} placeholder="Saluer ; Demander des nouvelles ; Conclure" />
                            </div>
                        </div>
                    )}

                    {/* Tags */}
                    <div className="space-y-2">
                        <Label>Tags (optionnel)</Label>
                        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="voyage, tourisme, culture" />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button onClick={handleSubmit} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
                        {isLoading && <Loader2 className="mr-2 animate-spin" size={14} />}
                        {editData ? 'Modifier' : 'Créer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
