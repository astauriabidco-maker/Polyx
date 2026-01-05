export interface DataGroup<T> {
    id: string;
    title: string;
    items: T[];
}

export class GroupingService {
    /**
     * Groups an array of items by a specific key.
     * Returns an array of DataGroup objects.
     */
    static groupBy<T>(items: T[], key: keyof T): DataGroup<T>[] {
        const groups: Record<string, T[]> = {};

        items.forEach(item => {
            const val = String(item[key] || 'Non spécifié');
            if (!groups[val]) {
                groups[val] = [];
            }
            groups[val].push(item);
        });

        return Object.entries(groups).map(([title, items]) => ({
            id: title,
            title,
            items
        })).sort((a, b) => b.items.length - a.items.length); // Sort by biggest group first
    }
}
