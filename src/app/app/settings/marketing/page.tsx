'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/application/store/auth-store';
import {
    getNurturingSequencesAction,
    createNurturingSequenceAction,
    processNurturingTasksAction,
    deleteNurturingSequenceAction,
    updateFullSequenceAction
} from '@/application/actions/nurturing.actions';
import { generateWebhookSecretAction, getWebhookSettingsAction } from '@/application/actions/webhook-settings.actions';
import { Mail, MessageSquare, Plus, Play, Clock, Trash2, Send, Zap, Edit, GripVertical, X, Link, Copy, Check } from 'lucide-react';

interface Step {
    id?: string;
    order: number;
    type: string;
    channel: string;
    delayInHours: number;
    subject?: string;
    content: string;
}

export default function MarketingSettingsPage() {
    const { activeOrganization } = useAuthStore();
    const [sequences, setSequences] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Edit Modal State
    const [editingSequence, setEditingSequence] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ name: '', description: '' });
    const [editSteps, setEditSteps] = useState<Step[]>([]);

    useEffect(() => {
        if (activeOrganization) {
            loadSequences();
        }
    }, [activeOrganization]);

    const loadSequences = async () => {
        if (!activeOrganization) return;
        setIsLoading(true);
        const res = await getNurturingSequencesAction(activeOrganization.id);
        if (res.success) setSequences(res.sequences || []);
        setIsLoading(false);
    };

    const handleRunNurturing = async () => {
        setIsProcessing(true);
        const res = await processNurturingTasksAction();
        if (res.success) {
            alert(`${res.processedCount} tâches traitées avec succès !`);
        } else {
            alert("Erreur lors de l'exécution : " + res.error);
        }
        setIsProcessing(false);
    };

    const handleCreateMockSequence = async () => {
        if (!activeOrganization) return;

        setIsLoading(true);
        const res = await createNurturingSequenceAction({
            organisationId: activeOrganization.id,
            name: "Relance NRP (Standard)",
            description: "Séquence de 3 relances pour les leads injoignables (NRP).",
            steps: [
                {
                    order: 1,
                    type: "SMS",
                    channel: "WHATSAPP",
                    delayInHours: 0,
                    content: "Bonjour {{firstName}}, j'ai tenté de vous joindre concernant votre demande de formation. Seriez-vous disponible demain pour un court échange ? Cordialement."
                },
                {
                    order: 2,
                    type: "EMAIL",
                    channel: "EMAIL",
                    delayInHours: 24,
                    subject: "Votre projet de formation - Polyx",
                    content: "Bonjour {{firstName}}, nous n'avons pas réussi à vous joindre par téléphone. Votre projet nous tient à cœur. Vous pouvez choisir un créneau directement dans mon agenda ici : [LIEN_AGENDA]. À bientôt !"
                },
                {
                    order: 3,
                    type: "SMS",
                    channel: "SMS",
                    delayInHours: 48,
                    content: "[URGENT] {{firstName}}, votre dossier de formation arrive à échéance. Sans retour de votre part sous 24h, nous devrons procéder à son archivage technique."
                }
            ]
        });

        if (res.success) {
            loadSequences();
        } else {
            alert("Erreur lors de la création : " + res.error);
            setIsLoading(false);
        }
    };

    const handleEdit = (seq: any) => {
        setEditingSequence(seq);
        setEditForm({ name: seq.name, description: seq.description || '' });
        setEditSteps(seq.steps.map((s: any) => ({
            id: s.id,
            order: s.order,
            type: s.type,
            channel: s.channel,
            delayInHours: s.delayInHours,
            subject: s.subject || '',
            content: s.content
        })));
    };

    const handleSaveEdit = async () => {
        if (!editingSequence) return;
        setIsSaving(true);

        // Recalculate order
        const orderedSteps = editSteps.map((s, idx) => ({ ...s, order: idx + 1 }));

        const res = await updateFullSequenceAction(editingSequence.id, {
            name: editForm.name,
            description: editForm.description,
            steps: orderedSteps
        });

        if (res.success) {
            setEditingSequence(null);
            loadSequences();
        } else {
            alert("Erreur lors de la mise à jour : " + res.error);
        }
        setIsSaving(false);
    };

    const handleDelete = async (seq: any) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer la séquence "${seq.name}" ? Cette action est irréversible.`)) return;
        const res = await deleteNurturingSequenceAction(seq.id);
        if (res.success) {
            loadSequences();
        } else {
            alert("Erreur lors de la suppression : " + res.error);
        }
    };

    const addStep = () => {
        setEditSteps([...editSteps, {
            order: editSteps.length + 1,
            type: 'SMS',
            channel: 'WHATSAPP',
            delayInHours: 24,
            content: ''
        }]);
    };

    const removeStep = (index: number) => {
        if (editSteps.length <= 1) {
            alert("Une séquence doit avoir au moins une étape.");
            return;
        }
        setEditSteps(editSteps.filter((_, i) => i !== index));
    };

    const updateStep = (index: number, field: keyof Step, value: any) => {
        const updated = [...editSteps];
        (updated[index] as any)[field] = value;
        setEditSteps(updated);
    };

    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Zap className="text-indigo-600" />
                        Marketing Automation
                    </h1>
                    <p className="text-slate-500">Gérez vos séquences de relances automatiques (Nurturing).</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={handleRunNurturing}
                        disabled={isProcessing}
                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-all font-medium"
                    >
                        {isProcessing ? <Clock className="animate-spin mr-2" size={16} /> : <Play className="mr-2" size={16} />}
                        Simuler le CRON
                    </Button>
                    <Button onClick={handleCreateMockSequence} className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="mr-2" size={16} /> Créer Séquence NRP
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle>Séquences de Nurturing</CardTitle>
                    <CardDescription>
                        Les leads sont inscrits dans ces séquences pour automatiser le suivi commercial.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead className="w-[300px]">Nom de la Séquence</TableHead>
                                <TableHead>Étapes</TableHead>
                                <TableHead>Délai Total</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Clock className="animate-spin" />
                                            Chargement des séquences...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : sequences.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-slate-500 bg-slate-50/20">
                                        <div className="max-w-xs mx-auto space-y-3">
                                            <p>Aucune séquence configurée pour le moment.</p>
                                            <Button variant="outline" size="sm" onClick={handleCreateMockSequence}>
                                                Initialiser une séquence standard
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sequences.map((seq) => (
                                    <TableRow key={seq.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="font-semibold text-slate-900 py-4">
                                            <div>{seq.name}</div>
                                            <div className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
                                                {seq.description}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex -space-x-1">
                                                {seq.steps.map((s: any) => (
                                                    <div
                                                        key={s.id}
                                                        title={`Étape ${s.order}: ${s.type} via ${s.channel} (+${s.delayInHours}h)`}
                                                        className={`
                                                            h-8 w-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs shadow-sm
                                                            ${s.type === 'SMS' ? 'bg-green-500' : 'bg-indigo-500'}
                                                        `}
                                                    >
                                                        {s.type === 'SMS' ? <MessageSquare size={12} /> : <Mail size={12} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                                <Clock size={14} className="text-slate-400" />
                                                {seq.steps.reduce((acc: number, s: any) => acc + s.delayInHours, 0)}h
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 uppercase tracking-wider">
                                                Actif
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(seq)}
                                                    className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                >
                                                    <Edit size={16} className="mr-1" /> Éditer
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(seq)}
                                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Strategy Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Send size={18} /> Engagement Multi-canal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-indigo-100 leading-relaxed">
                        Alternez entre relances par Email pour le contenu détaillé et WhatsApp/SMS pour l'urgence afin d'augmenter votre taux de réponse de 40%.
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm border-t-4 border-t-emerald-500">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-slate-900 border-none">
                            <Zap size={18} className="text-emerald-500" /> Auto-Inscription
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-500 leading-relaxed">
                        Configurez des déclencheurs automatiques : si un lead passe en statut "NRP" (Ne Répond Pas), il est immédiatement inscrit dans la séquence de relance.
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm border-t-4 border-t-amber-500">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-slate-900 border-none">
                            <Clock size={18} className="text-amber-500" /> Smart Timing
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-500 leading-relaxed">
                        Les relances sont programmées intelligemment pour éviter d'envoyer des messages durant la nuit ou les week-ends (en cours d'optimisation).
                    </CardContent>
                </Card>
            </div>

            <WebhookSettings />

            {/* Full Edit Modal with Step Editor */}
            {editingSequence && (
                <Modal isOpen={!!editingSequence} onClose={() => setEditingSequence(null)} title="Modifier la séquence">
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                        {/* Sequence Metadata */}
                        <div className="space-y-4">
                            <Input
                                label="Nom de la séquence"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                            <Input
                                label="Description"
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            />
                        </div>

                        {/* Steps Editor */}
                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-900">Étapes de la séquence</h3>
                                <Button variant="outline" size="sm" onClick={addStep} className="gap-1">
                                    <Plus size={14} /> Ajouter une étape
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {editSteps.map((step, index) => (
                                    <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <GripVertical size={16} className="text-slate-400" />
                                                <span className="font-bold text-slate-700">Étape {index + 1}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${step.type === 'SMS' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'
                                                    }`}>
                                                    {step.type}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeStep(index)}
                                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                                            >
                                                <X size={14} />
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs font-medium text-slate-600">Type</label>
                                                <select
                                                    value={step.type}
                                                    onChange={(e) => updateStep(index, 'type', e.target.value)}
                                                    className="w-full mt-1 text-sm border border-slate-200 rounded-md p-2 bg-white"
                                                >
                                                    <option value="SMS">SMS</option>
                                                    <option value="EMAIL">Email</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-600">Canal</label>
                                                <select
                                                    value={step.channel}
                                                    onChange={(e) => updateStep(index, 'channel', e.target.value)}
                                                    className="w-full mt-1 text-sm border border-slate-200 rounded-md p-2 bg-white"
                                                >
                                                    <option value="WHATSAPP">WhatsApp</option>
                                                    <option value="SMS">SMS</option>
                                                    <option value="EMAIL">Email</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-600">Délai (heures)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={step.delayInHours}
                                                    onChange={(e) => updateStep(index, 'delayInHours', parseInt(e.target.value) || 0)}
                                                    className="w-full mt-1 text-sm border border-slate-200 rounded-md p-2 bg-white"
                                                />
                                            </div>
                                        </div>

                                        {step.type === 'EMAIL' && (
                                            <div>
                                                <label className="text-xs font-medium text-slate-600">Sujet de l'email</label>
                                                <input
                                                    type="text"
                                                    value={step.subject || ''}
                                                    onChange={(e) => updateStep(index, 'subject', e.target.value)}
                                                    placeholder="Sujet de l'email..."
                                                    className="w-full mt-1 text-sm border border-slate-200 rounded-md p-2 bg-white"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-xs font-medium text-slate-600">Contenu du message</label>
                                            <textarea
                                                value={step.content}
                                                onChange={(e) => updateStep(index, 'content', e.target.value)}
                                                placeholder="Bonjour {{firstName}}, ..."
                                                rows={3}
                                                className="w-full mt-1 text-sm border border-slate-200 rounded-md p-2 bg-white resize-none"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Variables disponibles : {"{{firstName}}"}, {"{{lastName}}"}, {"{{phone}}"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white py-3">
                            <Button variant="outline" onClick={() => setEditingSequence(null)}>Annuler</Button>
                            <Button onClick={handleSaveEdit} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                                {isSaving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function WebhookSettings() {
    const { activeOrganization } = useAuthStore();
    const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const [origin, setOrigin] = useState('');

    useEffect(() => {
        if (activeOrganization) {
            loadSettings();
        }
        setOrigin(window.location.origin);
    }, [activeOrganization]);

    const loadSettings = async () => {
        if (!activeOrganization) return;
        setIsLoading(true);
        const res = await getWebhookSettingsAction(activeOrganization.id);
        if (res.success) {
            setWebhookSecret(res.secret ?? null);
        }
        setIsLoading(false);
    };

    const handleGenerate = async () => {
        if (!activeOrganization) return;
        if (webhookSecret && !confirm("Attention : Générer une nouvelle clé rendra l'ancienne invalide. Les webhooks existants cesseront de fonctionner. Continuer ?")) {
            return;
        }

        setIsGenerating(true);
        const res = await generateWebhookSecretAction(activeOrganization.id);
        if (res.success && res.secret) {
            setWebhookSecret(res.secret);
        } else {
            alert("Erreur: " + res.error);
        }
        setIsGenerating(false);
    };

    const webhookUrl = activeOrganization && webhookSecret && origin
        ? `${origin}/api/webhooks/leads?orgId=${activeOrganization.id}&secret=${webhookSecret}`
        : 'Générez une clé pour obtenir l\'URL';

    const copyToClipboard = () => {
        if (webhookSecret) {
            navigator.clipboard.writeText(webhookUrl);
            alert("URL copiée !");
        }
    };

    if (isLoading) return <div className="p-4 text-center text-slate-400">Chargement des paramètres Webhook...</div>;

    return (
        <Card className="border-slate-800 bg-slate-900 text-slate-100 mt-8">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Zap className="text-yellow-500" />
                    <CardTitle className="text-white">Webhooks d'Entrée</CardTitle>
                </div>
                <CardDescription className="text-slate-400">
                    Connectez vos Lead Ads (Facebook, TikTok) ou Zapier pour injecter des leads directement dans Polyx.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {!webhookSecret ? (
                    <div className="text-center py-6 bg-slate-950 rounded-lg border border-slate-800 border-dashed">
                        <p className="text-slate-400 mb-4">Aucune configuration détectée.</p>
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isGenerating ? 'Génération...' : 'Générer une URL Webhook'}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-300">Votre URL Webhook Unique</label>
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    value={webhookUrl}
                                    className="bg-slate-950 border-slate-700 text-slate-300 font-mono text-xs"
                                />
                                <Button size="icon" variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300" onClick={copyToClipboard}>
                                    <Copy size={16} />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="border-red-900/30 bg-red-900/10 hover:bg-red-900/30 text-red-400"
                                    onClick={handleGenerate}
                                    title="Régénérer la clé"
                                >
                                    <Zap size={16} />
                                </Button>
                            </div>
                            <p className="text-[10px] text-amber-500 flex items-center gap-1">
                                <Zap size={10} /> Ne partagez cette URL qu'avec vos outils de confiance (Zapier, Make, etc.).
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-300">Format Attendu (JSON)</label>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-700 overflow-x-auto">
                                <pre className="text-[10px] text-emerald-400 font-mono">
                                    {`{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+33612345678",
  "source": "FACEBOOK_ADS",
  "customFields": {
    "question": "réponse"
  }
}`}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
