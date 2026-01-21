'use client';

import { useState, useEffect } from 'react';
import { BookOpen, FileText, ChevronRight, PenLine, Save, Trash2, CheckCircle2, Calculator, Info, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Lead } from '@/domain/entities/lead';

interface Script {
    id: string;
    title: string;
    description: string;
    content: string;
    category: 'qualification' | 'objection' | 'closing';
}

const DEFAULT_SCRIPTS: Script[] = [
    {
        id: 'qualif-basic',
        title: 'Qualification Initiale',
        category: 'qualification',
        description: 'Pour le premier appel de découverte',
        content: `### 1. Introduction
"Bonjour {{firstName}}, c'est [Mon Nom] de Polyx. Je vous appelle suite à votre demande d'information concernant nos formations..."

### 2. Le "Pourquoi"
"Qu'est-ce qui vous a donné envie de vous renseigner aujourd'hui ? Avez-vous un projet professionnel spécifique ?"

### 3. Éligibilité
- Situation actuelle (Salarié, Demandeur d'emploi...)
- Budget CPF disponible ?
- Disponibilités pour la formation ?`
    },
    {
        id: 'obj-prix',
        title: 'Objection : Trop cher',
        category: 'objection',
        description: 'Quand le prospect bloque sur le reste à charge',
        content: `### L'approche "Investissement"
"Je comprends tout à fait {{firstName}}. C'est un budget. Cependant, si on regarde l'augmentation de salaire moyenne après cette certification, le retour sur investissement se fait en moins de 6 mois..."

### Échelonnement
"Saviez-vous que nous proposons un paiement en 3 ou 4 fois sans frais pour le reste à charge ?"

### CPF
"Avez-vous vérifié votre solde CPF {{firstName}} ? Souvent, cela couvre 80% à 100% du coût."`
    },
    {
        id: 'closing-direct',
        title: 'Closing Direct',
        category: 'closing',
        description: 'Pour finaliser l\'inscription',
        content: `### Verrouillage
"Tout semble correspondre à vos attentes {{firstName}}. Est-ce qu'on valide l'inscription ensemble maintenant pour garantir votre place sur la session du [Date] ?"

### Prochaine étape
"Je vous envoie le lien de validation par mail. Restez en ligne, on vérifie ensemble que vous le recevez bien."`
    }
];

interface SalesScriptsWidgetProps {
    selectedLead?: Lead | null;
}

export function SalesScriptsWidget({ selectedLead }: SalesScriptsWidgetProps) {
    const [activeTab, setActiveTab] = useState<'scripts' | 'calc' | 'notes'>('scripts');
    const [selectedScriptId, setSelectedScriptId] = useState<string>('qualif-basic');
    const [notes, setNotes] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Calculator State
    const [calcAmount, setCalcAmount] = useState<number>(2500);
    const [calcCPF, setCalcCPF] = useState<number>(0);
    const [calcDiscount, setCalcDiscount] = useState<number>(0);
    const [calcInstalments, setCalcInstalments] = useState<number>(3);

    // Initial load of notes from LocalStorage
    useEffect(() => {
        const savedNotes = localStorage.getItem('polyx_quick_notes');
        if (savedNotes) setNotes(savedNotes);
    }, []);

    // Selection of active script
    const activeScript = DEFAULT_SCRIPTS.find(s => s.id === selectedScriptId) || DEFAULT_SCRIPTS[0];

    // Variable Injection Logic
    const injectVariables = (content: string) => {
        if (!selectedLead) return content.replace(/{{firstName}}/g, "[Prénom]");
        return content.replace(/{{firstName}}/g, selectedLead.firstName || "Cher client");
    };

    const handleSaveNotes = () => {
        setIsSaving(true);
        localStorage.setItem('polyx_quick_notes', notes);
        setTimeout(() => {
            setIsSaving(false);
            setLastSaved(new Date());
        }, 500);
    };

    const clearNotes = () => {
        if (confirm('Vider le bloc-notes ?')) {
            setNotes('');
            localStorage.removeItem('polyx_quick_notes');
            setLastSaved(null);
        }
    };

    // Calculator Results
    const netAmount = Math.max(0, calcAmount - calcCPF - calcDiscount);
    const perInstalment = netAmount / calcInstalments;

    return (
        <div className="flex flex-col gap-0 h-full bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
            {/* Header / Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/40 p-1 gap-1">
                <button
                    onClick={() => setActiveTab('scripts')}
                    className={cn(
                        "flex-1 py-1.5 px-2 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all",
                        activeTab === 'scripts' ? "text-indigo-400 bg-indigo-500/10 shadow-sm" : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                    )}
                >
                    <BookOpen size={13} /> Scripts
                </button>
                <button
                    onClick={() => setActiveTab('calc')}
                    className={cn(
                        "flex-1 py-1.5 px-2 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all",
                        activeTab === 'calc' ? "text-amber-400 bg-amber-500/10 shadow-sm" : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                    )}
                >
                    <Calculator size={13} /> Calcul
                </button>
                <button
                    onClick={() => setActiveTab('notes')}
                    className={cn(
                        "flex-1 py-1.5 px-2 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all",
                        activeTab === 'notes' ? "text-emerald-400 bg-emerald-500/10 shadow-sm" : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                    )}
                >
                    <PenLine size={13} /> Notes
                </button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* SCRIPTS VIEW */}
                {activeTab === 'scripts' && (
                    <div className="flex-1 flex flex-col p-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
                                Trames d'entretien
                            </label>
                            <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
                                <SelectTrigger className="h-9 bg-slate-950 border-slate-800 text-xs text-slate-200">
                                    <SelectValue placeholder="Choisir un script" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                    {DEFAULT_SCRIPTS.map(s => (
                                        <SelectItem key={s.id} value={s.id} className="text-xs hover:bg-slate-800">
                                            <div className="flex items-center gap-2">
                                                <span>{s.title}</span>
                                                <Badge variant="outline" className="text-[8px] h-3 px-1 border-slate-700 text-slate-500 font-normal">
                                                    {s.category}
                                                </Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-950/50 rounded-xl p-4 border border-slate-800/50 custom-scrollbar">
                            <div className="prose prose-invert prose-xs max-w-none">
                                <p className="text-[10px] text-indigo-400 font-bold mb-2 uppercase flex items-center gap-1">
                                    <ChevronRight size={10} /> {activeScript.description}
                                </p>
                                <div className="text-slate-300 whitespace-pre-wrap text-xs leading-relaxed font-medium">
                                    {injectVariables(activeScript.content)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* CALCULATOR VIEW */}
                {activeTab === 'calc' && (
                    <div className="flex-1 flex flex-col p-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Coût Formation</label>
                                    <Input
                                        type="number"
                                        size={1}
                                        value={calcAmount}
                                        onChange={(e) => setCalcAmount(Number(e.target.value))}
                                        className="h-9 bg-slate-950 border-slate-800 text-xs text-slate-200"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Solde CPF</label>
                                    <Input
                                        type="number"
                                        value={calcCPF}
                                        onChange={(e) => setCalcCPF(Number(e.target.value))}
                                        className="h-9 bg-slate-950 border-slate-800 text-xs text-emerald-400"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Remise (€)</label>
                                    <Input
                                        type="number"
                                        value={calcDiscount}
                                        onChange={(e) => setCalcDiscount(Number(e.target.value))}
                                        className="h-9 bg-slate-950 border-slate-800 text-xs text-orange-400"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Échéances</label>
                                    <Select value={String(calcInstalments)} onValueChange={(v) => setCalcInstalments(Number(v))}>
                                        <SelectTrigger className="h-9 bg-slate-950 border-slate-800 text-xs text-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                            {[1, 2, 3, 4, 10, 12].map(n => (
                                                <SelectItem key={n} value={String(n)} className="text-xs">
                                                    {n} {n > 1 ? 'mensualités' : 'comptant'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden group">
                                <div className="absolute top-0 inset-x-0 h-1 bg-amber-500/20" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter mb-1">Reste à charge total</span>
                                <div className="text-3xl font-black text-white tracking-tighter">
                                    {netAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                </div>
                                {calcInstalments > 1 && (
                                    <div className="text-[10px] text-slate-400 mt-1 font-bold">
                                        soit {perInstalment.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} / mois
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* NOTES VIEW */}
                {activeTab === 'notes' && (
                    <div className="flex-1 flex flex-col p-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <PenLine size={12} /> Notes session
                            </label>
                            <div className="flex gap-1">
                                {lastSaved && (
                                    <span className="text-[8px] text-emerald-500 flex items-center gap-1 animate-in fade-in slide-in-from-right-1">
                                        <CheckCircle2 size={10} /> {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                                <button
                                    onClick={clearNotes}
                                    className="p-1 hover:text-rose-500 text-slate-600 transition-colors"
                                    title="Vider"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                        <div className="relative group flex-1 flex flex-col">
                            <Textarea
                                placeholder="Prenez des notes rapides ici pendant l'appel..."
                                className="flex-1 min-h-[150px] bg-slate-950 border-slate-800 text-xs focus-visible:ring-emerald-500 resize-none transition-all duration-300 group-hover:border-slate-700 p-4"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                            <Button
                                onClick={handleSaveNotes}
                                disabled={isSaving}
                                size="sm"
                                className={cn(
                                    "mt-2 w-full font-bold h-8 transition-all duration-300",
                                    isSaving ? "bg-emerald-600" : "bg-slate-800 hover:bg-indigo-600"
                                )}
                            >
                                <Save size={14} className={cn("mr-2", isSaving && "animate-pulse")} />
                                {isSaving ? 'Enregistrement...' : 'Sauvegarder'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #334155;
                }
            `}</style>
        </div>
    );
}
