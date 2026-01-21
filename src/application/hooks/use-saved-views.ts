import { useState, useEffect } from 'react';
import { SavedView, FilterGroup } from '@/domain/entities/filter';

const STORAGE_KEY = 'polyx_saved_views';

export function useSavedViews(moduleId: string) {
    const [views, setViews] = useState<SavedView[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const allViews = JSON.parse(stored) as SavedView[];
                setViews(allViews.filter(v => v.moduleId === moduleId));
            } catch (e) {
                console.error('Failed to parse saved views', e);
            }
        }
    }, [moduleId]);

    const saveView = (name: string, filters: FilterGroup, groupBy?: string) => {
        const newView: SavedView = {
            id: Math.random().toString(36).substring(7),
            name,
            moduleId,
            filters,
            groupBy,
            createdAt: new Date(),
        };

        const updatedViews = [...(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')), newView];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedViews));
        setViews(updatedViews.filter(v => v.moduleId === moduleId));
        return newView;
    };

    const deleteView = (id: string) => {
        const allViews = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as SavedView[];
        const updatedViews = allViews.filter(v => v.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedViews));
        setViews(updatedViews.filter(v => v.moduleId === moduleId));
    };

    return {
        views,
        saveView,
        deleteView,
    };
}
