'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2, Edit2, FileUp, RefreshCw, Eye } from 'lucide-react';
import { useAuthStore } from '@/application/store/auth-store';
import { getQuestionsByFilterAction } from '@/application/actions/question-bank.actions';
import { deleteQuestionAction } from '@/application/actions/question-crud.actions';
import { QuestionFormModal } from '@/components/studio/QuestionFormModal';
import { ImportQuestionsModal } from '@/components/studio/ImportQuestionsModal';
import { toast } from 'sonner';

const SECTION_LABELS: Record<string, string> = {
    READING: '📖 Lecture', LISTENING: '🎧 Écoute', WRITING: '✍️ Écrit',
    SPEAKING: '🎤 Oral', GRAMMAR: '📝 Grammaire', VOCABULARY: '📚 Vocabulaire',
};

const TYPE_LABELS: Record<string, string> = {
    MCQ: 'QCM', BOOLEAN: 'V/F', GAP_FILL: 'Trous', SHORT_ANSWER: 'Courte',
    MATCHING: 'Appariement', ORDERING: 'Ordre', OPEN_TEXT: 'Libre', AUDIO_DICTATION: 'Dictée',
};

const LEVEL_COLORS: Record<string, string> = {
    A1: 'bg-emerald-100 text-emerald-800', A2: 'bg-green-100 text-green-800',
    B1: 'bg-blue-100 text-blue-800', B2: 'bg-indigo-100 text-indigo-800',
    C1: 'bg-purple-100 text-purple-800', C2: 'bg-rose-100 text-rose-800',
};

export default function QuestionsPage() {
    const { user } = useAuthStore();
    const [questions, setQuestions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState({ type: '', level: '', search: '' });

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editQuestion, setEditQuestion] = useState<any>(null);

    useEffect(() => {
        loadQuestions();
    }, [user?.organizationId, filter.type, filter.level]);

    const loadQuestions = async () => {
        if (!user?.organizationId) return;
        setIsLoading(true);
        try {
            const res = await getQuestionsByFilterAction(user.organizationId, {
                sectionType: filter.type || undefined,
                level: filter.level || undefined,
            });
            if (res.success) setQuestions(res.data || []);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!user?.organizationId) return;
        if (!confirm('Supprimer cette question ?')) return;
        const res = await deleteQuestionAction(id, user.organizationId);
        if (res.success) {
            toast.success('Question supprimée');
            loadQuestions();
        }
    };

    const filteredQuestions = questions.filter(q =>
        !filter.search || q.content.toLowerCase().includes(filter.search.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Banque de Questions</h1>
                    <p className="text-slate-500 text-sm">{questions.length} questions disponibles</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowImportModal(true)}>
                        <FileUp size={14} className="mr-2" /> Importer
                    </Button>
                    <Button onClick={() => { setEditQuestion(null); setShowCreateModal(true); }} className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus size={14} className="mr-2" /> Créer
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-4">
                <CardContent className="p-3">
                    <div className="flex gap-3 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <Input
                                placeholder="Rechercher..."
                                className="pl-10 h-9"
                                value={filter.search}
                                onChange={e => setFilter({ ...filter, search: e.target.value })}
                            />
                        </div>
                        <Select value={filter.type} onValueChange={v => setFilter({ ...filter, type: v === 'all' ? '' : v })}>
                            <SelectTrigger className="w-44 h-9">
                                <SelectValue placeholder="Toutes sections" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Toutes sections</SelectItem>
                                {Object.entries(SECTION_LABELS).map(([k, v]) => (
                                    <SelectItem key={k} value={k}>{v}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filter.level} onValueChange={v => setFilter({ ...filter, level: v === 'all' ? '' : v })}>
                            <SelectTrigger className="w-28 h-9">
                                <SelectValue placeholder="Niveau" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous</SelectItem>
                                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
                                    <SelectItem key={l} value={l}>{l}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" onClick={loadQuestions}>
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Contenu</TableHead>
                            <TableHead className="w-32">Section</TableHead>
                            <TableHead className="w-24">Type</TableHead>
                            <TableHead className="w-20">Niveau</TableHead>
                            <TableHead className="w-24 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredQuestions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                    Aucune question trouvée
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredQuestions.slice(0, 50).map((q, idx) => (
                                <TableRow key={q.id} className="group">
                                    <TableCell className="text-slate-400 text-xs">{idx + 1}</TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-800 line-clamp-2">{q.content}</div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs">{SECTION_LABELS[q.sectionType] || q.sectionType}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                            {TYPE_LABELS[q.questionType] || q.questionType}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`${LEVEL_COLORS[q.level] || 'bg-slate-100'} text-xs`}>
                                            {q.level}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditQuestion(q); setShowCreateModal(true); }}>
                                                <Edit2 size={12} />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(q.id)}>
                                                <Trash2 size={12} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Modals */}
            <QuestionFormModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                orgId={user?.organizationId || ''}
                editData={editQuestion}
                onSuccess={loadQuestions}
            />
            <ImportQuestionsModal
                open={showImportModal}
                onOpenChange={setShowImportModal}
                orgId={user?.organizationId || ''}
                onSuccess={loadQuestions}
            />
        </div>
    );
}
