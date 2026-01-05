'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Loader2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lead } from '@/domain/entities/lead';
import { createManualLeadAction, getSalesRepsAction, getExamsAction, getAgenciesAction } from '@/application/actions/lead.actions';

interface CreateLeadModalProps {
    organizationId: string;
    onClose: () => void;
    onSuccess: (newLead: Lead) => void;
}

export function CreateLeadModal({ organizationId, onClose, onSuccess }: CreateLeadModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [salesReps, setSalesReps] = useState<{ id: string, name: string }[]>([]);
    const [exams, setExams] = useState<{ id: string, name: string, code: string }[]>([]);
    const [agencies, setAgencies] = useState<{ id: string, name: string, city: string }[]>([]);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        source: 'AGENCE',
        street: '',
        zipCode: '',
        city: '',
        examId: '',
        agencyId: '',
        assignedUserId: '',
        consentDate: '',
        responseDate: new Date().toISOString().split('T')[0],
        jobStatus: ''
    });

    // Fetch dropdown data on mount
    useEffect(() => {
        getSalesRepsAction(organizationId).then(res => {
            if (res.success && res.users) setSalesReps(res.users);
        });
        getExamsAction(organizationId).then(res => {
            if (res.success && res.exams) setExams(res.exams);
        });
        getAgenciesAction(organizationId).then(res => {
            if (res.success && res.agencies) setAgencies(res.agencies);
        });
    }, [organizationId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const leadData = {
                ...formData,
                examId: formData.examId || undefined,
                agencyId: formData.agencyId || undefined,
                consentDate: formData.consentDate ? new Date(formData.consentDate) : undefined,
                responseDate: formData.responseDate ? new Date(formData.responseDate) : new Date()
            };

            const result = await createManualLeadAction(leadData, organizationId);
            if (result.success && result.lead) {
                onSuccess(result.lead);
                onClose();
            } else {
                alert('Erreur lors de la création du lead.');
            }
        } catch (err) {
            console.error(err);
            alert('Une erreur est survenue.');
        } finally {
            setIsLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={onClose} />

            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                    <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2 mb-1">
                            <UserPlus className="text-indigo-600" size={20} />
                            <h2 className="text-xl font-bold text-slate-900">Nouveau Lead</h2>
                        </div>
                        <p className="text-sm text-slate-500">Créer une fiche client complète</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Identity Section */}
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <input
                                required
                                className="flex-1 text-lg font-bold border rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                                value={formData.firstName}
                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                placeholder="Prénom *"
                            />
                            <input
                                required
                                className="flex-1 text-lg font-bold border rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                                value={formData.lastName}
                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                placeholder="Nom *"
                            />
                        </div>
                        <input
                            type="email"
                            className="w-full text-sm border rounded p-2"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="Email"
                        />
                        <input
                            required
                            className="w-full text-sm border rounded p-2"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Téléphone *"
                        />
                    </div>

                    {/* Commercial Assigné */}
                    <div className="p-3 bg-indigo-50/50 rounded border border-indigo-100">
                        <p className="text-xs text-indigo-400 uppercase font-semibold mb-1">Commercial Assigné</p>
                        <select
                            className="w-full text-sm p-1 border rounded bg-white"
                            value={formData.assignedUserId}
                            onChange={e => setFormData({ ...formData, assignedUserId: e.target.value })}
                        >
                            <option value="">-- Non Assigné --</option>
                            {salesReps.map(rep => (
                                <option key={rep.id} value={rep.id}>{rep.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Grid Section - Source, Score, Exam, Branch */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded border border-slate-100">
                            <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Source</p>
                            <select
                                className="w-full text-sm p-1 border rounded bg-white"
                                value={formData.source}
                                onChange={e => setFormData({ ...formData, source: e.target.value })}
                            >
                                <option value="AGENCE">Agence Physique</option>
                                <option value="TERRAIN">Prospection Terrain</option>
                                <option value="meta">Meta (Facebook/Instagram)</option>
                                <option value="facebook">Facebook Ads</option>
                                <option value="GOOGLE_ADS">Google Ads</option>
                                <option value="linkedin">LinkedIn</option>
                                <option value="tiktok">TikTok</option>
                                <option value="website">Site Web</option>
                                <option value="REFERRAL">Parrainage</option>
                                <option value="apporteur_affaire">Apporteur d'Affaire</option>
                                <option value="api">API Externe</option>
                                <option value="autre">Autre</option>
                            </select>
                        </div>
                        <div className="p-3 bg-slate-50 rounded border border-slate-100">
                            <p className="text-xs text-slate-400 uppercase font-semibold mb-1">AI Score</p>
                            <p className="font-medium text-indigo-600">Auto-calculé</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded border border-slate-100">
                            <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Examen</p>
                            <select
                                className="w-full text-sm p-1 border rounded bg-white"
                                value={formData.examId}
                                onChange={e => setFormData({ ...formData, examId: e.target.value })}
                            >
                                <option value="">-- Sélectionner --</option>
                                {exams.map(exam => (
                                    <option key={exam.id} value={exam.id}>{exam.name} ({exam.code})</option>
                                ))}
                            </select>
                        </div>
                        <div className="p-3 bg-slate-50 rounded border border-slate-100">
                            <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Agence</p>
                            <select
                                className="w-full text-sm p-1 border rounded bg-white"
                                value={formData.agencyId}
                                onChange={e => setFormData({ ...formData, agencyId: e.target.value })}
                            >
                                <option value="">-- Sélectionner --</option>
                                {agencies.map(agency => (
                                    <option key={agency.id} value={agency.id}>{agency.name} - {agency.city}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Informations Complémentaires */}
                    <div className="p-4 bg-slate-50 rounded border border-slate-100 space-y-4">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <TrendingUp size={16} className="text-indigo-600" />
                            Informations Complémentaires
                        </h4>
                        <div>
                            <label className="text-xs text-slate-400 font-semibold uppercase">Situation Professionnelle</label>
                            <select
                                className="w-full text-sm p-1 border rounded bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 mt-1"
                                value={formData.jobStatus}
                                onChange={e => setFormData({ ...formData, jobStatus: e.target.value })}
                            >
                                <option value="">-- Sélectionner --</option>
                                <option value="SALARIE">Salarié(e)</option>
                                <option value="CDI">CDI</option>
                                <option value="CDD">CDD</option>
                                <option value="INDEPENDANT">Indépendant / Freelance</option>
                                <option value="CHOMAGE">Au Chômage</option>
                                <option value="RETRAITE">Retraité(e)</option>
                                <option value="ETUDIANT">Étudiant(e)</option>
                                <option value="AUTRE">Autre</option>
                            </select>
                        </div>
                    </div>

                    {/* Coordonnées & Adresse */}
                    <div className="p-4 bg-slate-50 rounded border border-slate-100 space-y-2">
                        <h4 className="text-sm font-bold text-slate-700">Coordonnées & Adresse</h4>
                        <div className="space-y-2">
                            <input
                                className="w-full text-sm p-1 border rounded"
                                placeholder="Rue / Adresse"
                                value={formData.street}
                                onChange={e => setFormData({ ...formData, street: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <input
                                    className="w-1/3 text-sm p-1 border rounded"
                                    placeholder="Code Postal"
                                    value={formData.zipCode}
                                    onChange={e => setFormData({ ...formData, zipCode: e.target.value })}
                                />
                                <input
                                    className="flex-1 text-sm p-1 border rounded"
                                    placeholder="Ville"
                                    value={formData.city}
                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dates Clés */}
                    <div className="p-4 bg-slate-50 rounded border border-slate-100 space-y-2">
                        <h4 className="text-sm font-bold text-slate-700">Dates Clés</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Consentement</p>
                                <input
                                    type="date"
                                    className="w-full text-sm p-1 border rounded"
                                    value={formData.consentDate}
                                    onChange={e => setFormData({ ...formData, consentDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Réponse</p>
                                <input
                                    type="date"
                                    className="w-full text-sm p-1 border rounded"
                                    value={formData.responseDate}
                                    onChange={e => setFormData({ ...formData, responseDate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={handleSubmit}
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Créer le Lead'}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}
