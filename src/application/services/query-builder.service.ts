import { FilterGroup, FilterRule, FilterOperator } from '@/domain/entities/filter';
import { subDays, subMonths, subYears } from 'date-fns';

export class QueryBuilderService {

    /**
     * Entry point to convert a FilterGroup into a Prisma WHERE clause.
     */
    static buildWhere(group: FilterGroup): any {
        if (!group.rules || group.rules.length === 0) return {};

        const conditions = group.rules.map(rule => {
            if ('conjunction' in rule) {
                return this.buildWhere(rule);
            }
            return this.buildRule(rule);
        });

        if (group.conjunction === 'and') {
            return { AND: conditions };
        } else {
            return { OR: conditions };
        }
    }

    /**
     * Converts a single FilterRule into a Prisma condition.
     */
    static buildRule(rule: FilterRule): any {
        const { fieldId, operator, value } = rule;

        switch (operator) {
            case 'not_equals':
                return { [fieldId]: { not: value } };
            case 'contains':
                return { [fieldId]: { contains: value, mode: 'insensitive' } };
            case 'not_contains':
                return { [fieldId]: { not: { contains: value, mode: 'insensitive' } } };
            case 'gt':
                return { [fieldId]: { gt: value } };
            case 'gte':
                return { [fieldId]: { gte: value } };
            case 'lt':
                return { [fieldId]: { lt: value } };
            case 'lte':
                return { [fieldId]: { lte: value } };
            case 'in':
                const inValues = Array.isArray(value) ? value : String(value).split(',').map(v => v.trim());
                return { [fieldId]: { in: inValues } };
            case 'is_empty':
                return { OR: [{ [fieldId]: null }, { [fieldId]: '' }] };
            case 'is_not_empty':
                return { AND: [{ [fieldId]: { not: null } }, { [fieldId]: { not: '' } }] };

            case 'older_than': {
                const date = this.getRelativeDate(String(value));
                if (fieldId === 'lastTrainingDate') {
                    return { learner: { folders: { some: { officialEndDate: { lt: date }, status: 'COMPLETED' } } } };
                }
                return { [fieldId]: { lt: date } };
            }
            case 'newer_than': {
                const date = this.getRelativeDate(String(value));
                if (fieldId === 'lastTrainingDate') {
                    return { learner: { folders: { some: { officialEndDate: { gt: date }, status: 'COMPLETED' } } } };
                }
                return { [fieldId]: { gt: date } };
            }

            case 'equals': {
                if (fieldId === 'hasTraining') {
                    return (value === 'false' || value === false) ? { learner: { is: null } } : { learner: { isNot: null } };
                }
                return { [fieldId]: value };
            }

            default:
                return { [fieldId]: value };
        }
    }

    /**
     * Helper to get a Date object from a relative time string like "6m"
     */
    private static getRelativeDate(value: string): Date {
        const num = parseInt(value);
        const unit = value.replace(String(num), '').toLowerCase().trim() || 'd';
        const now = new Date();

        switch (unit) {
            case 'd': return subDays(now, num);
            case 'm': return subMonths(now, num);
            case 'y': return subYears(now, num);
            default: return subDays(now, num);
        }
    }
}
