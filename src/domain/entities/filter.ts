export type FilterOperator =
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'between'
    | 'in'
    | 'is_empty'
    | 'is_not_empty'
    | 'older_than'
    | 'newer_than';

export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'enum';

export interface FieldDefinition {
    id: string;
    label: string;
    type: FieldType;
    options?: { label: string; value: any }[]; // For enums
}

export interface FilterRule {
    id: string;
    fieldId: string;
    operator: FilterOperator;
    value: any;
}

export interface FilterGroup {
    id: string;
    conjunction: 'and' | 'or';
    rules: (FilterRule | FilterGroup)[];
}

export interface SavedView {
    id: string;
    name: string;
    moduleId: string;
    filters: FilterGroup;
    groupBy?: string; // [NEW] Persist grouping choice
    isDefault?: boolean;
    createdAt: Date;
}
