'use client';

import { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Mail, Phone, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    sendBulkSmsAction,
    sendBulkWhatsAppAction,
    sendBulkEmailAction,
    getWhatsAppTemplatesAction
} from '@/application/actions/communication.actions';
import { useAuthStore } from '@/application/store/auth-store';

interface CommunicationModalProps {
    leadIds: string[];
    onClose: () => void;
    onSuccess: () => void;
    title?: string;
    description?: string;
    targetType?: 'lead' | 'learner';
}

type Channel = 'sms' | 'whatsapp' | 'email';

export function CommunicationModal({ leadIds, onClose, onSuccess, title, description, targetType = 'lead' }: CommunicationModalProps) {
    const { activeOrganization } = useAuthStore();
    const [channel, setChannel] = useState<Channel>('whatsapp');
    const [message, setMessage] = useState('');
    const [subject, setSubject] = useState('Suivi de votre dossier');
    const [isSending, setIsSending] = useState(false);
    const [result, setResult] = useState<{ success: number, failed: number } | null>(null);
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');

    useEffect(() => {
        if (activeOrganization) {
            getWhatsAppTemplatesAction(activeOrganization.id).then(res => {
                if (res.success && res.data) setTemplates(res.data);
            });
        }
    }, [activeOrganization]);

    const handleSend = async () => {
        if (!activeOrganization || !message) return;
        setIsSending(true);

        try {
            let res;
            if (channel === 'sms') {
                res = await sendBulkSmsAction(activeOrganization.id, leadIds, message, targetType);
            } else if (channel === 'whatsapp') {
                res = await sendBulkWhatsAppAction(activeOrganization.id, leadIds, message, targetType);
            } else if (channel === 'email') {
                res = await sendBulkEmailAction(activeOrganization.id, leadIds, {
                    subject,
                    text: message,
                    html: message.replace(/\n/g, '<br/>')
                }, targetType);
            }

            if (res?.success) {
                setResult(res.summary!);
            } else {
                alert(res?.error || "Une erreur est survenue");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    const handleTemplateChange = (templateId: string) => {
        setSelectedTemplate(templateId);
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setMessage(template.content);
        }
    };

    if (result) {
        return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
                    <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="text-emerald-500" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Envoi Terminé</h3>
                    <p className="text-slate-400 text-sm mb-6">
                        {result.success} messages envoyés avec succès.<br />
                        {result.failed} échecs.
                    </p>
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-500" onClick={onSuccess}>
                        Fermer
                    </Button>
                </div>
            </div>
        );
    }

    const isIndividual = leadIds.length === 1;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Send size={20} className="text-indigo-400" />
                            {title || (isIndividual ? 'Envoyer un message' : 'Relance Omnicanale')}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            {description || (isIndividual ? 'Envoi individuel' : `Envoi groupé à ${leadIds.length} destinataires`)}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Channel Selection */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                            { id: 'sms', label: 'SMS', icon: Phone, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                            { id: 'email', label: 'Email', icon: Mail, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => setChannel(item.id as Channel)}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${channel === item.id
                                    ? 'border-indigo-500 bg-indigo-500/5'
                                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                                    }`}
                            >
                                <div className={`p-2 rounded-lg ${item.bg}`}>
                                    <item.icon size={20} className={item.color} />
                                </div>
                                <span className="text-xs font-bold text-slate-300">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Form */}
                    <div className="space-y-4">
                        {channel === 'whatsapp' && templates.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modèles WhatsApp</label>
                                <select
                                    value={selectedTemplate}
                                    onChange={(e) => handleTemplateChange(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">Sélectionner un modèle...</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {channel === 'email' && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Objet du mail</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message</label>
                                <div className="text-[10px] text-indigo-400 font-mono">Variable: {'{{name}}'}</div>
                            </div>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={6}
                                placeholder={channel === 'email' ? "Corps du mail..." : "Tapez votre message ici..."}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                            />
                        </div>

                        {/* Cost info */}
                        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3 flex items-start gap-3">
                            <AlertCircle size={16} className="text-indigo-400 mt-0.5" />
                            <div className="text-[11px] text-indigo-300">
                                Coût estimé : <span className="font-bold">{(leadIds.length * (channel === 'whatsapp' ? 0.15 : channel === 'sms' ? 0.10 : 0.01)).toFixed(2)}€</span><br />
                                Le montant sera débité de votre portefeuille d'organisation.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-950/30 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isSending}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={isSending || !message}
                        className="bg-indigo-600 hover:bg-indigo-500 min-w-[120px]"
                    >
                        {isSending ? <Loader2 size={16} className="animate-spin mr-2" /> : <Send size={16} className="mr-2" />}
                        Envoyer
                    </Button>
                </div>
            </div>
        </div>
    );
}
