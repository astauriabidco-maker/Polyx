'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { FieldDefinition, FilterGroup, FilterRule, FilterOperator } from '@/domain/entities/filter';

const DEFAULT_OPERATORS: Record<string, { label: string; value: FilterOperator }[]> = {
    text: [
        { label: 'Contient', value: 'contains' },
        { label: 'Est égal à', value: 'equals' },
        { label: 'Différent de', value: 'not_equals' },
        { label: 'Est vide', value: 'is_empty' },
    ],
    number: [
        { label: '=', value: 'equals' },
        { label: '>', value: 'gt' },
        { label: '<', value: 'lt' },
        { label: '>=', value: 'gte' },
        { label: '<=', value: 'lte' },
    ],
    enum: [
        { label: 'Est', value: 'equals' },
        { label: 'N\'est pas', value: 'not_equals' },
    ],
    date: [
        { label: 'Après le', value: 'gt' },
        { label: 'Avant le', value: 'lt' },
        { label: 'Le', value: 'equals' },
        { label: 'Plus vieux que', value: 'older_than' },
        { label: 'Plus récent que', value: 'newer_than' },
    ],
};

interface SegmentBuilderProps {
    fields: FieldDefinition[];
    initialFilterGroup?: FilterGroup;
    onChange: (filters: FilterGroup) => void;
}

export function SegmentBuilder({ fields, initialFilterGroup, onChange }: SegmentBuilderProps) {
    const [filterGroup, setFilterGroup] = useState<FilterGroup>(initialFilterGroup || {
        id: 'root',
        conjunction: 'and',
        rules: [],
    });

    const handleUpdate = useCallback((newGroup: FilterGroup) => {
        setFilterGroup(newGroup);
        onChange(newGroup);
    }, [onChange]);

    return (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 shadow-inner">
            <GroupView
                group={filterGroup}
                fields={fields}
                onChange={handleUpdate}
                isRoot
            />
        </div>
    );
}

interface GroupViewProps {
    group: FilterGroup;
    fields: FieldDefinition[];
    onChange: (group: FilterGroup) => void;
    isRoot?: boolean;
}

function GroupView({ group, fields, onChange, isRoot }: GroupViewProps) {
    const addRule = () => {
        const firstField = fields[0];
        const newRule: FilterRule = {
            id: Math.random().toString(36).substring(7),
            fieldId: firstField.id,
            operator: DEFAULT_OPERATORS[firstField.type][0].value,
            value: firstField.type === 'enum' ? (firstField.options?.[0]?.value || '') : '',
        };
        onChange({ ...group, rules: [...group.rules, newRule] });
    };

    const addSubGroup = () => {
        const newGroup: FilterGroup = {
            id: Math.random().toString(36).substring(7),
            conjunction: 'and',
            rules: [],
        };
        onChange({ ...group, rules: [...group.rules, newGroup] });
    };

    const removeRuleOrGroup = (id: string) => {
        onChange({ ...group, rules: group.rules.filter(r => r.id !== id) });
    };

    const updateItem = (id: string, updatedItem: FilterRule | FilterGroup) => {
        onChange({ ...group, rules: group.rules.map(r => r.id === id ? updatedItem : r) });
    };

    return (
        <div className={`space-y-4 ${isRoot ? '' : 'pl-6 border-l-2 border-slate-800 pt-2 ml-2'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {group.rules.length > 1 && (
                        <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                            <button
                                onClick={() => onChange({ ...group, conjunction: 'and' })}
                                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${group.conjunction === 'and' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                AND
                            </button>
                            <button
                                onClick={() => onChange({ ...group, conjunction: 'or' })}
                                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${group.conjunction === 'or' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                OR
                            </button>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={addRule} className="h-8 px-3 text-xs bg-slate-950 border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50">
                            <Plus size={14} className="mr-1" /> Règle
                        </Button>
                        <Button variant="outline" size="sm" onClick={addSubGroup} className="h-8 px-3 text-xs bg-slate-950 border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50">
                            <Plus size={14} className="mr-1" /> Groupe
                        </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {group.rules.map((item) => {
                    const isGroup = 'conjunction' in item;

                    if (isGroup) {
                        return (
                            <div key={item.id} className="relative group/item">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeRuleOrGroup(item.id)}
                                    className="absolute -left-8 top-2 h-6 w-6 p-0 text-slate-600 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                >
                                    <Trash size={14} />
                                </Button>
                                <GroupView group={item as FilterGroup} fields={fields} onChange={(updated) => updateItem(item.id, updated)} />
                            </div>
                        );
                    }

                    const rule = item as FilterRule;
                    const field = fields.find(f => f.id === rule.fieldId)!;
                    const operators = DEFAULT_OPERATORS[field?.type || 'text'] || DEFAULT_OPERATORS.text;

                    return (
                        <div key={rule.id} className="flex gap-3 items-center group/rule bg-slate-950/50 p-2 rounded-lg border border-transparent hover:border-slate-800 transition-all">
                            <Select value={rule.fieldId} onValueChange={(val) => {
                                const newField = fields.find(f => f.id === val)!;
                                const newOps = DEFAULT_OPERATORS[newField.type] || DEFAULT_OPERATORS.text;
                                updateItem(rule.id, { ...rule, fieldId: val, operator: newOps[0].value, value: '' });
                            }}>
                                <SelectTrigger className="h-9 w-[160px] bg-slate-900 border-slate-800 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-950 border-slate-800 text-slate-200 shadow-2xl">
                                    {fields.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <Select value={rule.operator} onValueChange={(val) => updateItem(rule.id, { ...rule, operator: val as any })}>
                                <SelectTrigger className="h-9 w-[140px] bg-slate-900 border-slate-800 text-xs text-slate-400 focus:ring-1 focus:ring-indigo-500/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                                    {operators.map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            {!['is_empty', 'is_not_empty'].includes(rule.operator) && (
                                <div className="flex-1">
                                    {field?.type === 'enum' ? (
                                        <Select value={rule.value} onValueChange={(val) => updateItem(rule.id, { ...rule, value: val })}>
                                            <SelectTrigger className="h-9 bg-slate-900 border-slate-800 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500/50">
                                                <SelectValue placeholder="Choisir..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                                                {field.options?.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            type={field?.type === 'number' ? 'number' : 'text'}
                                            className="h-9 bg-slate-900 border-slate-800 text-xs text-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500/50"
                                            placeholder={['older_than', 'newer_than'].includes(rule.operator) ? "ex: 6m, 30d, 1y" : "Valeur..."}
                                            value={rule.value}
                                            onChange={(e) => updateItem(rule.id, { ...rule, value: e.target.value })}
                                        />
                                    )}
                                </div>
                            )}

                            <Button
                                variant="ghost"
                                className="h-9 w-9 p-0 text-slate-600 hover:text-red-400 opacity-0 group-hover/rule:opacity-100 transition-opacity"
                                onClick={() => removeRuleOrGroup(rule.id)}
                            >
                                <X size={16} />
                            </Button>
                        </div>
                    );
                })}
            </div>

            {group.rules.length === 0 && (
                <div
                    onClick={addRule}
                    className="text-[11px] text-slate-500 italic py-6 text-center border-2 border-dashed border-slate-800 rounded-xl cursor-pointer hover:border-indigo-500/30 hover:bg-indigo-500/5 hover:text-indigo-400 transition-all"
                >
                    + Cliquez pour ajouter une condition au segment
                </div>
            )}
        </div>
    );
}
