'use client';

import { useState, useEffect } from 'react';
import {
    Users,
    Plus,
    Trash,
    Play,
    Target,
    Info,
    ChevronRight,
    Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/application/store/auth-store';
import {
    getSegmentsAction,
    createSegmentAction,
    deleteSegmentAction,
    executeSegmentAction,
    enrollSegmentInSequenceAction
} from '@/application/actions/segment.actions';
import { getNurturingSequencesAction } from '@/application/actions/nurturing.actions';
import { SegmentBuilder } from '@/components/marketing/SegmentBuilder';
import { LEAD_FIELDS } from '@/application/lib/lead-fields';
import { FilterGroup } from '@/domain/entities/filter';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';

export default function SegmentsPage() {
    const { activeOrganization } = useAuthStore();
    const [segments, setSegments] = useState<any[]>([]);
    const [sequences, setSequences] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Create Segment State
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newFilters, setNewFilters] = useState<FilterGroup>({ id: 'root', conjunction: 'and', rules: [] });

    // Automation State
    const [selectedSegment, setSelectedSegment] = useState<any>(null);
    const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');
    const [isEnrolling, setIsEnrolling] = useState(false);

    useEffect(() => {
        if (activeOrganization) {
            loadData();
        }
    }, [activeOrganization]);

    const loadData = async () => {
        if (!activeOrganization) return;
        setIsLoading(true);
        const [segmentsRes, sequencesRes] = await Promise.all([
            getSegmentsAction(activeOrganization.id),
            getNurturingSequencesAction(activeOrganization.id)
        ]);

        if (segmentsRes.success) setSegments(segmentsRes.segments || []);
        if (sequencesRes.success) setSequences(sequencesRes.sequences || []);
        setIsLoading(false);
    };

    const handleCreateSegment = async () => {
        if (!activeOrganization || !newName) return;
        const res = await createSegmentAction({
            organisationId: activeOrganization.id,
            name: newName,
            description: newDesc,
            filterGroup: newFilters
        });

        if (res.success) {
            setIsCreateModalOpen(false);
            setNewName('');
            setNewDesc('');
            loadData();
        }
    };

    const handleDeleteSegment = async (id: string) => {
        if (!confirm("Supprimer ce segment ?")) return;
        const res = await deleteSegmentAction(id);
        if (res.success) loadData();
    };

    const handleRunAutomation = async () => {
        if (!selectedSegment || !selectedSequenceId) return;
        setIsEnrolling(true);
        const res = await enrollSegmentInSequenceAction(selectedSegment.id, selectedSequenceId);
        setIsEnrolling(false);
        if (res.success) {
            alert(`${res.count} leads ont été inscrits à la séquence.`);
            setSelectedSegment(null);
        } else {
            alert("Erreur: " + res.error);
        }
    };

    if (!activeOrganization) return null;

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-50 overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <Users className="text-indigo-400" size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100 italic tracking-tight">Segmentation Dynamique</h1>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Ciblage & Audiences Marketing</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-6 shadow-lg shadow-indigo-900/20">
                                <Plus size={18} className="mr-2" /> Nouveau Segment
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl bg-slate-950 border-slate-800 text-slate-200">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold italic">Créer un Segment</DialogTitle>
                                <DialogDescription className="text-slate-400 text-sm">
                                    Définissez les critères de filtrage pour votre audience cible.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Nom du segment</label>
                                        <Input
                                            placeholder="ex: Leads Facebook Chauds"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="bg-slate-900 border-slate-800 focus:ring-1 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Description (optionnel)</label>
                                        <Input
                                            placeholder="ex: Ciblage pour campagne relance SMS"
                                            value={newDesc}
                                            onChange={(e) => setNewDesc(e.target.value)}
                                            className="bg-slate-900 border-slate-800 focus:ring-1 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Critères de filtrage</label>
                                    <SegmentBuilder fields={LEAD_FIELDS} onChange={setNewFilters} />
                                </div>
                            </div>

                            <DialogFooter className="border-t border-slate-900 pt-6">
                                <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Annuler</Button>
                                <Button onClick={handleCreateSegment} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8">Enregistrer le Segment</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.05),transparent_40%)] pointer-events-none" />

                <div className="max-w-6xl mx-auto space-y-8 relative z-10">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-500 text-xs animate-pulse">Chargement de vos audiences...</p>
                        </div>
                    ) : segments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-96 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-3xl gap-6">
                            <div className="p-6 bg-slate-900 rounded-full border border-slate-800/50">
                                <Target size={48} className="text-slate-700" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-300">Aucun segment créé</h3>
                                <p className="text-slate-500 text-sm mt-2">Commencez par créer votre première audience dynamique.</p>
                            </div>
                            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                                Créer mon premier segment
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {segments.map(segment => (
                                <div key={segment.id} className="group bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800 hover:border-indigo-500/30 rounded-2xl p-6 transition-all duration-300 shadow-xl overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSegment(segment.id)} className="h-8 w-8 p-0 text-slate-500 hover:text-red-400">
                                            <Trash size={16} />
                                        </Button>
                                    </div>

                                    <div className="flex flex-col h-full gap-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">{segment.name}</h3>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{segment.description || "Aucune description"}</p>
                                        </div>

                                        <div className="flex-1 space-y-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="bg-slate-800 text-[10px] text-slate-400">
                                                    {(segment.filterGroup as any).rules?.length || 0} conditions
                                                </Badge>
                                                <span className="text-[10px] text-slate-600">Créé {new Date(segment.createdAt).toLocaleDateString()}</span>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 min-h-[40px]">
                                                {(segment.filterGroup as any).rules?.slice(0, 3).map((rule: any, i: number) => (
                                                    <span key={i} className="px-2 py-0.5 bg-indigo-500/5 border border-indigo-500/10 rounded text-[9px] text-indigo-300/80">
                                                        {LEAD_FIELDS.find(f => f.id === rule.fieldId)?.label || rule.fieldId}
                                                    </span>
                                                ))}
                                                {(segment.filterGroup as any).rules?.length > 3 && (
                                                    <span className="text-[9px] text-slate-600 self-center">+{(segment.filterGroup as any).rules.length - 3} plus</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-800/50 flex gap-2">
                                            <Button
                                                variant="secondary"
                                                className="flex-1 text-[11px] h-9 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border-transparent transition-all"
                                                onClick={() => setSelectedSegment(segment)}
                                            >
                                                <Play size={14} className="mr-2" /> Marketing Automation
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Automation Modal */}
            <Dialog open={!!selectedSegment} onOpenChange={(open) => !open && setSelectedSegment(null)}>
                <DialogContent className="bg-slate-950 border-slate-800 text-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold italic flex items-center gap-3">
                            <Play className="text-emerald-500" size={24} />
                            Automation : {selectedSegment?.name}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-sm">
                            Lancez une séquence de nurturing pour tous les leads correspondant à ce segment.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-6">
                        <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-2">
                            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase">
                                <Info size={14} /> Information
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                Cette action va inscrire immédiatement tous les leads actuels du segment à la séquence choisie. Les nouveaux leads entrant dans le segment par la suite ne seront pas inscrits automatiquement (système snapshot).
                            </p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Choisir la séquence de relance</label>
                            <Select value={selectedSequenceId} onValueChange={setSelectedSequenceId}>
                                <SelectTrigger className="h-12 bg-slate-900 border-slate-800 text-slate-200">
                                    <SelectValue placeholder="Sélectionner une séquence..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                                    {sequences.map(seq => (
                                        <SelectItem key={seq.id} value={seq.id}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold">{seq.name}</span>
                                                <span className="text-[10px] text-slate-500">{seq.steps?.length || 0} étapes multicanales</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                    {sequences.length === 0 && <div className="p-2 text-xs text-slate-500">Aucune séquence active</div>}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t border-slate-900">
                        <Button variant="ghost" onClick={() => setSelectedSegment(null)}>Annuler</Button>
                        <Button
                            onClick={handleRunAutomation}
                            disabled={!selectedSequenceId || isEnrolling}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-lg shadow-emerald-900/20"
                        >
                            {isEnrolling ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Inscription...
                                </div>
                            ) : "Lancer le Nurturing"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
