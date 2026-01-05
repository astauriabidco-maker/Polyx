'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CallbackSchedulerModalProps {
    leadName: string;
    onClose: () => void;
    onSchedule: (date: Date) => void;
}

export function CallbackSchedulerModal({ leadName, onClose, onSchedule }: CallbackSchedulerModalProps) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    const handleConfirm = () => {
        if (!date || !time) {
            alert("Veuillez sélectionner une date et une heure.");
            return;
        }
        const scheduledDate = new Date(`${date}T${time}`);
        onSchedule(scheduledDate);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
            <Card className="w-full max-w-md p-6 bg-white shadow-xl animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Clock className="text-indigo-600" />
                    Programmer une Relance
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                    Quand souhaitez-vous relancer <strong>{leadName}</strong> ?
                </p>

                <div className="space-y-4 mb-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Date de relance</label>
                        <input
                            type="date"
                            className="w-full p-2 border rounded-md"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Heure</label>
                        <input
                            type="time"
                            className="w-full p-2 border rounded-md"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={onClose}>Annuler</Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleConfirm}>
                        Programmer la relance
                    </Button>
                </div>
            </Card>
        </div>
    );
}
