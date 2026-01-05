'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash, Search, Save, History, X, Layers, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { FieldDefinition, FilterGroup, FilterRule, FilterOperator } from '@/domain/entities/filter';
import { useSavedViews } from '@/application/hooks/use-saved-views';

interface DynamicFilterBarProps {
    fields: FieldDefinition[];
    moduleId: string;
    onFilterChange: (filters: FilterGroup) => void;
    currentGroupBy?: string; // [NEW] Current grouping choice
    onGroupByChange?: (groupBy: string) => void; // [NEW] Callback to change grouping
}

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
    ],
};

export function DynamicFilterBar({ fields, moduleId, onFilterChange, currentGroupBy, onGroupByChange }: DynamicFilterBarProps) {
    const [filterGroup, setFilterGroup] = useState<FilterGroup>({
        id: 'root',
        conjunction: 'and',
        rules: [],
    });
    const { views, saveView } = useSavedViews(moduleId);

    useEffect(() => {
        onFilterChange(filterGroup);
    }, [filterGroup, onFilterChange]);

    const handleUpdate = useCallback((newGroup: FilterGroup) => {
        setFilterGroup(newGroup);
    }, []);

    const clearAll = () => {
        setFilterGroup({ id: 'root', conjunction: 'and', rules: [] });
    };

    return (
        <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
                    <Badge variant="secondary" className="bg-slate-800 text-slate-400 border-slate-700 px-2 h-8">
                        Filtre Dynamique
                    </Badge>

                    {filterGroup.rules.length > 0 && (
                        <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-2 h-8 whitespace-nowrap">
                            {filterGroup.rules.length} blocs actifs
                            <X size={12} className="ml-2 cursor-pointer hover:text-white" onClick={clearAll} />
                        </Badge>
                    )}

                    <Select onValueChange={(val) => {
                        const view = views.find(v => v.id === val);
                        if (view) {
                            setFilterGroup(view.filters);
                            if (view.groupBy && onGroupByChange) {
                                onGroupByChange(view.groupBy);
                            }
                        }
                    }}>
                        <SelectTrigger className="w-[180px] h-8 bg-transparent border-slate-800 text-xs text-slate-300">
                            <History size={14} className="mr-2 text-slate-500" />
                            <SelectValue placeholder="Vues enregistrées" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                            {views.map(view => (
                                <SelectItem key={view.id} value={view.id}>{view.name}</SelectItem>
                            ))}
                            {views.length === 0 && (
                                <div className="p-2 text-[10px] text-slate-500 text-center">Aucune vue</div>
                            )}
                        </SelectContent>
                    </Select>

                    {/* [NEW] Dynamic Grouping Selector based on Metadata */}
                    {onGroupByChange && (
                        <Select value={currentGroupBy} onValueChange={onGroupByChange}>
                            <SelectTrigger className="w-[160px] h-8 bg-indigo-500/5 border-indigo-500/20 text-xs text-indigo-400 focus:ring-0">
                                <Layout size={14} className="mr-2 opacity-70" />
                                <SelectValue placeholder="Regrouper par..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                <SelectItem value="default">🎯 Smart Queues</SelectItem>
                                <div className="h-px bg-slate-800 my-1 mx-2" />
                                <div className="px-2 py-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">Champs Disponibles</div>
                                {fields.map(field => (
                                    <SelectItem key={field.id} value={field.id}>
                                        {field.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <div className="flex gap-2">
                    {filterGroup.rules.length > 0 && (
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => {
                            const name = prompt("Nom de la vue ?");
                            if (name) saveView(name, filterGroup, currentGroupBy);
                        }}>
                            <Save size={14} className="mr-2" /> Sauvegarder
                        </Button>
                    )}
                </div>
            </div>

            {/* Recursive Group Component */}
            <GroupView
                group={filterGroup}
                fields={fields}
                onChange={handleUpdate}
                onDelete={() => clearAll()}
                isRoot
            />
        </div>
    );
}

// --- Recursive Sub-Component ---

interface GroupViewProps {
    group: FilterGroup;
    fields: FieldDefinition[];
    onChange: (group: FilterGroup) => void;
    onDelete: () => void;
    isRoot?: boolean;
}

function GroupView({ group, fields, onChange, onDelete, isRoot }: GroupViewProps) {
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
        <div className={`space-y-3 ${isRoot ? '' : 'pl-6 border-l-2 border-indigo-500/20 py-2'}`}>
            <div className="flex items-center gap-3">
                {/* Conjunction Toggle */}
                {group.rules.length > 1 && (
                    <div className="flex bg-slate-800/50 rounded-lg p-0.5 border border-slate-700/50">
                        <button
                            onClick={() => onChange({ ...group, conjunction: 'and' })}
                            className={`px-3 py-1 text-[10px] rounded font-bold transition-all ${group.conjunction === 'and' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            ET
                        </button>
                        <button
                            onClick={() => onChange({ ...group, conjunction: 'or' })}
                            className={`px-3 py-1 text-[10px] rounded font-bold transition-all ${group.conjunction === 'or' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            OU
                        </button>
                    </div>
                )}

                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={addRule}
                        className="h-7 px-2 text-[10px] text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/5"
                    >
                        <Plus size={10} className="mr-1.5" /> Règle
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={addSubGroup}
                        className="h-7 px-2 text-[10px] text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5"
                    >
                        <Layers size={10} className="mr-1.5" /> Bloc
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                {group.rules.map((item) => {
                    const isGroup = 'conjunction' in item;

                    if (isGroup) {
                        return (
                            <div key={item.id} className="relative">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeRuleOrGroup(item.id)}
                                    className="absolute -left-3 top-2 h-6 w-6 text-slate-700 hover:text-red-400 z-10"
                                >
                                    <Trash size={12} />
                                </Button>
                                <GroupView
                                    group={item as FilterGroup}
                                    fields={fields}
                                    onChange={(updated) => updateItem(item.id, updated)}
                                    onDelete={() => removeRuleOrGroup(item.id)}
                                />
                            </div>
                        );
                    }

                    const rule = item as FilterRule;
                    const field = fields.find(f => f.id === rule.fieldId)!;
                    const operators = DEFAULT_OPERATORS[field.type];

                    return (
                        <div key={rule.id} className="flex flex-wrap gap-2 items-center p-2 bg-slate-900/30 rounded-lg border border-slate-800/30 group/rule animate-in slide-in-from-left-2">
                            <Select
                                value={rule.fieldId}
                                onValueChange={(val) => {
                                    const newField = fields.find(f => f.id === val)!;
                                    const newOps = DEFAULT_OPERATORS[newField.type];
                                    updateItem(rule.id, {
                                        ...rule,
                                        fieldId: val,
                                        operator: newOps[0].value,
                                        value: newField.type === 'enum' ? (newField.options?.[0]?.value || '') : ''
                                    });
                                }}
                            >
                                <SelectTrigger className="h-7 bg-transparent border-slate-800 text-[11px] w-40 text-slate-300">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                    {fields.map(f => (
                                        <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={rule.operator}
                                onValueChange={(val) => updateItem(rule.id, { ...rule, operator: val as FilterOperator })}
                            >
                                <SelectTrigger className="h-7 w-32 bg-transparent border-slate-800 text-[10px] text-slate-300">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                    {operators.map(op => (
                                        <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {!['is_empty', 'is_not_empty'].includes(rule.operator) && (
                                <div className="flex-1 min-w-[120px]">
                                    {field.type === 'enum' ? (
                                        <Select
                                            value={rule.value}
                                            onValueChange={(val) => updateItem(rule.id, { ...rule, value: val })}
                                        >
                                            <SelectTrigger className="h-7 bg-slate-950/50 border-slate-800 text-[11px] text-slate-300">
                                                <SelectValue placeholder="Valeur..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                                {field.options?.map(opt => (
                                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                            className="h-7 bg-slate-950/50 border-slate-800 text-[11px] text-slate-300"
                                            placeholder="Valeur..."
                                            value={rule.value}
                                            onChange={(e) => updateItem(rule.id, { ...rule, value: e.target.value })}
                                        />
                                    )}
                                </div>
                            )}

                            <Button
                                variant="ghost"
                                className="h-8 w-8 text-slate-600 hover:text-red-400"
                                onClick={() => removeRuleOrGroup(rule.id)}
                            >
                                <Trash size={14} />
                            </Button>
                        </div>
                    );
                })}

                {group.rules.length === 0 && (
                    <div className="text-[10px] text-slate-600 italic py-2">
                        Aucune condition dans ce bloc
                    </div>
                )}
            </div>
        </div>
    );
}
