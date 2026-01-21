'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Search, Filter, BookOpen, Clock, Tag } from 'lucide-react';
import { getTrainingsAction, deleteTrainingAction } from '@/application/actions/training.actions';
import { useAuthStore } from '@/application/store/auth-store';
import { TrainingDrawer } from '@/components/academy/TrainingDrawer';

export default function CatalogPage() {
    const { activeOrganization, hasPermission } = useAuthStore();
    const [trainings, setTrainings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Drawer State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedTraining, setSelectedTraining] = useState<any>(null);

    useEffect(() => {
        if (activeOrganization) {
            loadCatalog();
        }
    }, [activeOrganization]);

    const loadCatalog = async () => {
        setIsLoading(true);
        const res = await getTrainingsAction(activeOrganization!.id);
        if (res.success && res.trainings) {
            setTrainings(res.trainings);
        } else {
            setTrainings([]);
        }
        setIsLoading(false);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Voulez-vous vraiment supprimer ce produit ?')) return;
        await deleteTrainingAction(id, activeOrganization!.id);
        loadCatalog();
    };

    const handleEdit = (training: any) => {
        setSelectedTraining(training);
        setIsDrawerOpen(true);
    };

    const handleCreate = () => {
        setSelectedTraining(null);
        setIsDrawerOpen(true);
    };

    const filteredTrainings = trainings.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Catalogue de Formation</h1>
                    <p className="text-slate-500">Gérez votre offre de formation : Programmes, Prix, Durées.</p>
                </div>
                {hasPermission('canManageCourses') && (
                    <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 font-bold gap-2">
                        <Plus size={18} /> Nouveau Produit
                    </Button>
                )}
            </header>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <Input
                        placeholder="Rechercher un module (Titre, Code ref...)"
                        className="pl-10 border-0 bg-transparent focus-visible:ring-0"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <Button variant="ghost" className="text-slate-500 gap-2">
                    <Filter size={16} /> Filtres
                </Button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <p className="text-slate-400 col-span-3 text-center py-20">Chargement du catalogue...</p>
                ) : filteredTrainings.length === 0 ? (
                    <div className="col-span-3 text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="font-bold text-slate-900 text-lg">Catalogue vide</h3>
                        <p className="text-slate-500 mb-6">Commencez par ajouter votre première formation.</p>
                        <Button onClick={handleCreate} variant="outline">Créer un produit</Button>
                    </div>
                ) : (
                    filteredTrainings.map((training) => (
                        <Card
                            key={training.id}
                            className="group hover:shadow-lg transition-all cursor-pointer border-slate-200 overflow-hidden"
                            onClick={() => handleEdit(training)}
                        >
                            <div className="h-2 bg-indigo-500 w-full" />
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded">
                                        {training.code || 'NO-REF'}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${training.level === 'BEGINNER' ? 'bg-green-100 text-green-700' :
                                        training.level === 'EXPERT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {training.level}
                                    </span>
                                </div>

                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1 group-hover:text-indigo-600 transition-colors">
                                        {training.title}
                                    </h3>
                                    <p className="text-slate-500 text-sm line-clamp-2">{training.description || "Aucune description"}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-600 pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-1">
                                        <Clock size={14} className="text-slate-400" />
                                        {training.durationHours}h
                                    </div>
                                    <div className="flex items-center gap-1 justify-end">
                                        <Tag size={14} className="text-slate-400" />
                                        {training.priceHt} €
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <TrainingDrawer
                isOpen={isDrawerOpen}
                onClose={() => { setIsDrawerOpen(false); loadCatalog(); }}
                training={selectedTraining}
            />
        </div>
    );
}
