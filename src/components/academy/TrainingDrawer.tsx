'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/application/store/auth-store';
import { createTrainingAction, updateTrainingAction } from '@/application/actions/training.actions';
import { Loader2 } from 'lucide-react';

interface TrainingDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    training?: any; // If present, edit mode
}

export function TrainingDrawer({ isOpen, onClose, training }: TrainingDrawerProps) {
    const { activeOrganization } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        code: '',
        durationHours: '',
        priceHt: '',
        level: 'BEGINNER',
        category: 'Développement',
        description: ''
    });

    useEffect(() => {
        if (training) {
            setFormData({
                title: training.title,
                code: training.code || '',
                durationHours: training.durationHours.toString(),
                priceHt: training.priceHt.toString(),
                level: training.level,
                category: training.category || 'Développement',
                description: training.description || ''
            });
        } else {
            // Reset for create mode
            setFormData({
                title: '',
                code: '',
                durationHours: '',
                priceHt: '',
                level: 'BEGINNER',
                category: 'Développement',
                description: ''
            });
        }
    }, [training, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeOrganization) return;

        setIsLoading(true);

        try {
            if (training) {
                await updateTrainingAction(training.id, formData, activeOrganization.id);
            } else {
                await createTrainingAction(formData, activeOrganization.id);
            }
            onClose();
        } catch (error) {
            console.error(error);
            alert("Erreur lors de l'enregistrement");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-[600px] bg-slate-50 p-0 flex flex-col h-full">
                <SheetHeader className="px-6 py-6 border-b border-slate-200 bg-white">
                    <SheetTitle className="text-xl font-bold text-slate-900">
                        {training ? 'Modifier la Formation' : 'Créer une Formation'}
                    </SheetTitle>
                    <SheetDescription>
                        Configurez les détails pédagogiques et financiers du produit.
                    </SheetDescription>
                </SheetHeader>

                <form id="training-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Informations Générales</h3>

                        <div className="grid grid-cols-4 gap-4 items-center">
                            <Label htmlFor="code" className="text-right text-slate-500">Code Ref.</Label>
                            <Input
                                id="code"
                                className="col-span-3 font-mono"
                                placeholder="ex: DEV-REACT-01"
                                value={formData.code}
                                onChange={(e) => handleChange('code', e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-4 items-center">
                            <Label htmlFor="title" className="text-right text-slate-500">Titre</Label>
                            <Input
                                id="title"
                                className="col-span-3 font-bold"
                                placeholder="ex: Maîtriser React 19"
                                required
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-4 items-center">
                            <Label htmlFor="category" className="text-right text-slate-500">Catégorie</Label>
                            <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Choisir..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Développement">Tech & Développement</SelectItem>
                                    <SelectItem value="Langues">Langues Étrangères</SelectItem>
                                    <SelectItem value="Management">Management & Soft Skills</SelectItem>
                                    <SelectItem value="Vente">Commerce & Vente</SelectItem>
                                    <SelectItem value="Sécurité">Sécurité & Qualité</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="my-6 border-t border-slate-200" />

                    {/* Modalités */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Modalités & Prix</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Durée (Heures)</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        className="pl-8"
                                        value={formData.durationHours}
                                        onChange={(e) => handleChange('durationHours', e.target.value)}
                                    />
                                    <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">⏱</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Prix HT (€)</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        className="pl-8 font-mono"
                                        value={formData.priceHt}
                                        onChange={(e) => handleChange('priceHt', e.target.value)}
                                    />
                                    <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">€</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Niveau Requis</Label>
                            <Select value={formData.level} onValueChange={(v) => handleChange('level', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BEGINNER">🟢 Débutant</SelectItem>
                                    <SelectItem value="INTERMEDIATE">🔵 Intermédiaire</SelectItem>
                                    <SelectItem value="ADVANCED">🔴 Avancé</SelectItem>
                                    <SelectItem value="EXPERT">🟣 Expert</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label>Programme Pédagogique (Résumé)</Label>
                        <Textarea
                            className="min-h-[100px]"
                            placeholder="Objectifs de la formation, public visé..."
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                        />
                    </div>

                </form>

                <SheetFooter className="px-6 py-4 border-t border-slate-200 bg-white">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Annuler</Button>
                    <Button type="submit" form="training-form" className="bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                        {training ? 'Mettre à jour' : 'Créer le produit'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
