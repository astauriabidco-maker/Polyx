'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Clock, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { getCollaboratorAvailabilityAction, setCollaboratorAvailabilityAction } from '@/application/actions/agenda.actions';

interface AvailabilitySlot {
    dayOfWeek: number;
    startHour: number;
    endHour: number;
}

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function AvailabilityManager({ userId }: { userId: string }) {
    const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadAvailability();
    }, [userId]);

    const loadAvailability = async () => {
        setIsLoading(true);
        const res = await getCollaboratorAvailabilityAction(userId);
        if (res.success) {
            setSlots(res.data || []);
        }
        setIsLoading(false);
    };

    const handleAddSlot = () => {
        setSlots([...slots, { dayOfWeek: 1, startHour: 9, endHour: 18 }]);
    };

    const handleRemoveSlot = (index: number) => {
        setSlots(slots.filter((_, i) => i !== index));
    };

    const handleSlotChange = (index: number, field: keyof AvailabilitySlot, value: number) => {
        const updated = [...slots];
        updated[index] = { ...updated[index], [field]: value };
        setSlots(updated);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const res = await setCollaboratorAvailabilityAction(userId, slots);
        setIsSaving(false);
        if (res.success) {
            alert('✅ Disponibilités enregistrées !');
        } else {
            alert(res.error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    return (
        <Card className="border-slate-200">
            <CardHeader className="border-b bg-slate-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Clock size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Mes Disponibilités</h3>
                            <p className="text-xs text-slate-500">Définissez vos horaires de travail récurrents</p>
                        </div>
                    </div>
                    <Button onClick={handleAddSlot} variant="outline" size="sm" className="gap-2">
                        <Plus size={14} /> Ajouter
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {slots.length === 0 ? (
                    <p className="text-slate-400 text-center py-6">Aucune disponibilité définie. Ajoutez vos créneaux de travail.</p>
                ) : (
                    slots.map((slot, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <select
                                value={slot.dayOfWeek}
                                onChange={(e) => handleSlotChange(i, 'dayOfWeek', Number(e.target.value))}
                                className="border rounded-lg px-3 py-2 text-sm font-medium"
                            >
                                {DAYS.map((d, idx) => (
                                    <option key={idx} value={idx}>{d}</option>
                                ))}
                            </select>
                            <span className="text-slate-400">de</span>
                            <select
                                value={slot.startHour}
                                onChange={(e) => handleSlotChange(i, 'startHour', Number(e.target.value))}
                                className="border rounded-lg px-3 py-2 text-sm"
                            >
                                {Array.from({ length: 24 }, (_, h) => (
                                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                                ))}
                            </select>
                            <span className="text-slate-400">à</span>
                            <select
                                value={slot.endHour}
                                onChange={(e) => handleSlotChange(i, 'endHour', Number(e.target.value))}
                                className="border rounded-lg px-3 py-2 text-sm"
                            >
                                {Array.from({ length: 24 }, (_, h) => (
                                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                                ))}
                            </select>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveSlot(i)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    ))
                )}

                <div className="pt-4 flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Enregistrer
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
