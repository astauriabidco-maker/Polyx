import { FilterGroup, FilterRule, FilterOperator } from '@/domain/entities/filter';

export class FilterService {

    /**
     * Evaluates a filter group against a single item.
     */
    static evaluateGroup(item: any, group: FilterGroup): boolean {
        if (group.rules.length === 0) return true;

        if (group.conjunction === 'and') {
            return group.rules.every(rule => {
                if ('conjunction' in rule) {
                    return this.evaluateGroup(item, rule);
                }
                return this.evaluateRule(item, rule);
            });
        } else {
            return group.rules.some(rule => {
                if ('conjunction' in rule) {
                    return this.evaluateGroup(item, rule);
                }
                return this.evaluateRule(item, rule);
            });
        }
    }

    /**
     * Evaluates a single filter rule against an item.
     */
    static evaluateRule(item: any, rule: FilterRule): boolean {
        const itemValue = item[rule.fieldId];
        const filterValue = rule.value;

        switch (rule.operator) {
            case 'equals':
                return itemValue === filterValue;
            case 'not_equals':
                return itemValue !== filterValue;
            case 'contains':
                if (typeof itemValue !== 'string') return false;
                return itemValue.toLowerCase().includes(String(filterValue).toLowerCase());
            case 'not_contains':
                if (typeof itemValue !== 'string') return true;
                return !itemValue.toLowerCase().includes(String(filterValue).toLowerCase());
            case 'gt':
                return itemValue > filterValue;
            case 'gte':
                return itemValue >= filterValue;
            case 'lt':
                return itemValue < filterValue;
            case 'lte':
                return itemValue <= filterValue;
            case 'between':
                if (!Array.isArray(filterValue) || filterValue.length !== 2) return true;
                return itemValue >= filterValue[0] && itemValue <= filterValue[1];
            case 'in':
                if (!Array.isArray(filterValue)) return true;
                return filterValue.includes(itemValue);
            case 'is_empty':
                return itemValue === null || itemValue === undefined || itemValue === '';
            case 'is_not_empty':
                return itemValue !== null && itemValue !== undefined && itemValue !== '';
            default:
                return true;
        }
    }

    /**
     * Filters an array of items based on a filter group.
     */
    static filterArray<T>(items: T[], group: FilterGroup): T[] {
        return items.filter(item => this.evaluateGroup(item, group));
    }
}
