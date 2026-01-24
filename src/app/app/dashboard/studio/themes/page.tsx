'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Tags } from 'lucide-react';
import { useAuthStore } from '@/application/store/auth-store';
import { createThemeAction, getThemesAction, deleteThemeAction } from '@/application/actions/theme.actions';
import { getTrainingsCompactAction } from '@/application/actions/training.actions';
import { toast } from 'sonner';

export default function ThemesPage() {
    const { user } = useAuthStore();
    const [themes, setThemes] = useState<any[]>([]);
    const [trainings, setTrainings] = useState<any[]>([]);

    const [newTheme, setNewTheme] = useState({
        name: '',
        description: '',
        keyVocabulary: '',
        situations: '',
        styleNotes: '',
        trainingIds: [] as string[],
    });

    useEffect(() => {
        if (user?.organizationId) {
            loadData();
        }
    }, [user?.organizationId]);

    const loadData = async () => {
        if (!user?.organizationId) return;
        const [themesRes, trainingsRes] = await Promise.all([
            getThemesAction(user.organizationId),
            getTrainingsCompactAction(user.organizationId),
        ]);
        if (themesRes.success) setThemes(themesRes.data || []);
        if (trainingsRes.success) setTrainings(trainingsRes.data || []);
    };

    const handleCreate = async () => {
        if (!user?.organizationId || !newTheme.name) {
            return toast.error('Nom requis');
        }
        const res = await createThemeAction(user.organizationId, newTheme);
        if (res.success) {
            toast.success('Thématique créée !');
            setNewTheme({ name: '', description: '', keyVocabulary: '', situations: '', styleNotes: '', trainingIds: [] });
            loadData();
        }
    };

    const handleDelete = async (id: string) => {
        if (!user?.organizationId) return;
        if (!confirm('Supprimer cette thématique ?')) return;
        await deleteThemeAction(id, user.organizationId);
        toast.success('Thématique supprimée');
        loadData();
    };

    return (
        <div className="p-6 max-w-3xl">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Thématiques</h1>
                    <p className="text-slate-500 text-sm">Définissez le contexte pour la génération IA</p>
                </div>
            </div>

            {/* Create Form */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Tags className="text-indigo-500" size={18} />
                        Nouvelle thématique
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Nom *</Label>
                            <Input
                                value={newTheme.name}
                                onChange={e => setNewTheme({ ...newTheme, name: e.target.value })}
                                placeholder="Ex: Voyages et tourisme"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Description</Label>
                            <Input
                                value={newTheme.description}
                                onChange={e => setNewTheme({ ...newTheme, description: e.target.value })}
                                placeholder="Brève description"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs text-slate-500">🔤 Vocabulaire clé</Label>
                        <Textarea
                            value={newTheme.keyVocabulary}
                            onChange={e => setNewTheme({ ...newTheme, keyVocabulary: e.target.value })}
                            placeholder="aéroport, réservation, hébergement, billet, passeport..."
                            className="min-h-[60px]"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs text-slate-500">💬 Situations types</Label>
                        <Textarea
                            value={newTheme.situations}
                            onChange={e => setNewTheme({ ...newTheme, situations: e.target.value })}
                            placeholder="Réserver un hôtel, demander des renseignements, se plaindre d'un service..."
                            className="min-h-[60px]"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs text-slate-500">📝 Consignes de style</Label>
                        <Input
                            value={newTheme.styleNotes}
                            onChange={e => setNewTheme({ ...newTheme, styleNotes: e.target.value })}
                            placeholder="Registre formel, contexte professionnel..."
                        />
                    </div>

                    {trainings.length > 0 && (
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Lier aux formations</Label>
                            <div className="flex flex-wrap gap-2">
                                {trainings.map(t => (
                                    <Badge
                                        key={t.id}
                                        variant={newTheme.trainingIds.includes(t.id) ? 'secondary' : 'outline'}
                                        className="cursor-pointer"
                                        onClick={() => {
                                            if (newTheme.trainingIds.includes(t.id)) {
                                                setNewTheme(n => ({ ...n, trainingIds: n.trainingIds.filter(id => id !== t.id) }));
                                            } else {
                                                setNewTheme(n => ({ ...n, trainingIds: [...n.trainingIds, t.id] }));
                                            }
                                        }}
                                    >
                                        {t.title}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button onClick={handleCreate} className="w-full bg-indigo-600 hover:bg-indigo-700">
                        <Plus size={14} className="mr-2" /> Créer la thématique
                    </Button>
                </CardContent>
            </Card>

            {/* List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Thématiques existantes ({themes.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {themes.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">Aucune thématique créée</p>
                    ) : (
                        themes.map(t => (
                            <div key={t.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg group">
                                <div className="flex-1">
                                    <div className="font-medium text-slate-800">{t.name}</div>
                                    {t.description && <div className="text-xs text-slate-500">{t.description}</div>}
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {t.keyVocabulary && <Badge variant="outline" className="text-xs">🔤 Vocabulaire</Badge>}
                                        {t.situations && <Badge variant="outline" className="text-xs">💬 Situations</Badge>}
                                        {t.styleNotes && <Badge variant="outline" className="text-xs">📝 Style</Badge>}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 text-red-500"
                                    onClick={() => handleDelete(t.id)}
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
