'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, Save, RefreshCw, Zap, Mail, MousePointer2, AlertTriangle } from 'lucide-react';

const DEFAULT_WEIGHTS = [
    { id: 'PAGE_VIEW', label: 'Vue de Page', icon: <RefreshCw size={16} />, weight: 2 },
    { id: 'FORM_INTERACTION', label: 'Interaction Formulaire', icon: <Zap size={16} />, weight: 10 },
    { id: 'EMAIL_OPEN', label: 'Ouverture Email', icon: <Mail size={16} />, weight: 5 },
    { id: 'EMAIL_CLICK', label: 'Clic Email', icon: <MousePointer2 size={16} />, weight: 15 },
    { id: 'PRICING_VIEW', label: 'Consultation Tarifs', icon: <TrendingUp size={16} />, weight: 25 },
    { id: 'FRESHNESS_BONUS', label: 'Bonus < 24h', icon: <Zap size={16} />, weight: 20 },
];

export default function ScoringSettingsPage() {
    const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
    const [isSaving, setIsSaving] = useState(false);

    const handleWeightChange = (id: string, value: string) => {
        const num = parseInt(value) || 0;
        setWeights(prev => prev.map(w => w.id === id ? { ...w, weight: num } : w));
    };

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            alert('Configuraton du scoring enregistrée avec succès !');
        }, 800);
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Configurateur de Scoring IA</h1>
                <p className="text-slate-500">Ajustez la sensibilité de l'algorithme prédictif en fonction des actions de vos leads.</p>
            </div>

            <div className="grid gap-6">
                <Card className="border-indigo-100 shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Zap size={18} className="text-indigo-600" />
                            Matrice de Pondération
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            {weights.map((w) => (
                                <div key={w.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            {w.icon}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{w.label}</p>
                                            <p className="text-xs text-slate-400">ID: {w.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-slate-400">Poids (pts)</span>
                                        <Input
                                            type="number"
                                            className="w-20 text-center font-bold text-indigo-600"
                                            value={w.weight}
                                            onChange={(e) => handleWeightChange(w.id, e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex gap-4">
                    <AlertTriangle className="text-yellow-600 shrink-0" />
                    <div className="text-sm text-yellow-800">
                        <p className="font-bold mb-1">Impact sur le Pipeline</p>
                        <p>Les changements de pondération affecteront le score de tous les leads lors de leur prochain rafraîchissement ou nouvelle activité.</p>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-8"
                    >
                        {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                        Enregistrer la Configuration
                    </Button>
                </div>
            </div>
        </div>
    );
}
