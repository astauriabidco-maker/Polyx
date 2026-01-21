'use client';

import { useEffect, useState } from 'react';
import {
    Phone,
    FileText,
    Mail,
    ArrowRightLeft,
    Calendar,
    Plus,
    Send
} from 'lucide-react';
import { getLeadActivitiesAction, addLeadActivityAction, type ActivityType } from '@/application/actions/activity.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Activity {
    id: string;
    type: string;
    content: string | null;
    createdAt: Date;
    user: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
    };
}

interface ActivityTimelineProps {
    leadId: string;
}

export default function ActivityTimeline({ leadId }: ActivityTimelineProps) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newNote, setNewNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadActivities();
    }, [leadId]);

    async function loadActivities() {
        setIsLoading(true);
        const result = await getLeadActivitiesAction(leadId);
        if (result.success && result.activities) {
            setActivities(result.activities as Activity[]);
        }
        setIsLoading(false);
    }

    async function handleAddNote() {
        if (!newNote.trim()) return;

        setIsSubmitting(true);
        const result = await addLeadActivityAction(leadId, 'NOTE', newNote);
        if (result.success) {
            setNewNote('');
            loadActivities();
        }
        setIsSubmitting(false);
    }

    function getActivityIcon(type: string) {
        switch (type) {
            case 'CALL':
                return <Phone size={14} className="text-blue-600" />;
            case 'NOTE':
                return <FileText size={14} className="text-amber-600" />;
            case 'EMAIL':
                return <Mail size={14} className="text-purple-600" />;
            case 'STATUS_CHANGE':
                return <ArrowRightLeft size={14} className="text-green-600" />;
            case 'MEETING':
                return <Calendar size={14} className="text-indigo-600" />;
            case 'CREATED':
                return <Plus size={14} className="text-slate-600" />;
            default:
                return <FileText size={14} className="text-slate-400" />;
        }
    }

    function formatDate(date: Date) {
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }

    if (isLoading) {
        return (
            <div className="p-4 text-center text-slate-400 text-sm">
                Chargement de l'historique...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Add Note Input */}
            <div className="flex gap-2">
                <Input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Ajouter une note..."
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
                />
                <Button
                    onClick={handleAddNote}
                    disabled={isSubmitting || !newNote.trim()}
                    size="sm"
                    className="gap-1"
                >
                    <Send size={14} />
                </Button>
            </div>

            {/* Timeline */}
            {activities.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                    Aucune activité enregistrée
                </div>
            ) : (
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[15px] top-0 bottom-0 w-px bg-slate-200" />

                    <div className="space-y-4">
                        {activities.map((activity) => (
                            <div key={activity.id} className="flex gap-3 relative">
                                {/* Icon */}
                                <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center z-10 shadow-sm">
                                    {getActivityIcon(activity.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 pt-1">
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
                                        <span className="font-medium text-slate-600">
                                            {activity.user.firstName || activity.user.email.split('@')[0]}
                                        </span>
                                        <span>•</span>
                                        <span>{formatDate(activity.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-slate-700">
                                        {activity.content || getDefaultContent(activity.type)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function getDefaultContent(type: string): string {
    switch (type) {
        case 'CALL':
            return 'Appel effectué';
        case 'CREATED':
            return 'Lead créé';
        case 'STATUS_CHANGE':
            return 'Statut modifié';
        default:
            return 'Activité';
    }
}
