'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash, Search, Save, History, X, Layers, Layout, Filter as FilterIcon } from 'lucide-react';
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { FieldDefinition, FilterGroup, FilterRule, FilterOperator } from '@/domain/entities/filter';
import { useSavedViews } from '@/application/hooks/use-saved-views';

interface DynamicFilterBarProps {
    fields: FieldDefinition[];
    moduleId: string;
    onFilterChange: (filters: FilterGroup) => void;
    currentGroupBy?: string;
    onGroupByChange?: (groupBy: string) => void;
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
        { label: 'Plus vieux que', value: 'older_than' },
        { label: 'Plus récent que', value: 'newer_than' },
    ],
};

function FilterSummary({ group, fields, onRemove }: { group: FilterGroup, fields: FieldDefinition[], onRemove: (id: string) => void }) {
    // Only shows top-level rules for simplicity in summary, distincting groups is harder visually in small space
    return (
        <div className="flex flex-wrap gap-2 items-center">
            {group.rules.map(rule => {
                if ('conjunction' in rule) return null; // Skip subgroups in summary for now or show as "Custom Group"
                const field = fields.find(f => f.id === rule.fieldId);
                const op = DEFAULT_OPERATORS[field?.type || 'text']?.find(o => o.value === rule.operator);

                return (
                    <Badge key={rule.id} variant="secondary" className="bg-indigo-900/40 text-indigo-300 border-indigo-500/30 flex items-center gap-1 hover:bg-indigo-900/60 transition-colors">
                        <span className="opacity-70 font-normal">{field?.label}</span>
                        <span className="opacity-50 mx-0.5">{op?.label}</span>
                        <span className="font-semibold">{rule.value}</span>
                        <X
                            size={12}
                            className="ml-1.5 cursor-pointer hover:text-white"
                            onClick={(e) => { e.stopPropagation(); onRemove(rule.id); }}
                        />
                    </Badge>
                );
            })}
            {group.rules.some(r => 'conjunction' in r) && (
                <Badge variant="outline" className="text-slate-500 border-slate-700 bg-slate-900/50">
                    + Blocs complexes
                </Badge>
            )}
        </div>
    );
}

export function DynamicFilterBar({ fields, moduleId, onFilterChange, currentGroupBy, onGroupByChange }: DynamicFilterBarProps) {
    const [filterGroup, setFilterGroup] = useState<FilterGroup>({
        id: 'root',
        conjunction: 'and',
        rules: [],
    });
    const [open, setOpen] = useState(false);
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

    const removeRule = (id: string) => {
        setFilterGroup(prev => ({
            ...prev,
            rules: prev.rules.filter(r => r.id !== id)
        }));
    };

    const hasActiveFilters = filterGroup.rules.length > 0;

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full animate-in fade-in slide-in-from-top-2">

            {/* 1. Main Controls */}
            <div className="flex items-center gap-2">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant={hasActiveFilters ? "secondary" : "outline"}
                            size="sm"
                            className={`
                                h-8 gap-2 transition-all border-slate-700
                                ${hasActiveFilters
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 border-transparent shadow shadow-indigo-900/20'
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }
                            `}
                        >
                            <FilterIcon size={14} />
                            Filtres
                            {hasActiveFilters && (
                                <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                                    {filterGroup.rules.length}
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-[480px] p-4 bg-slate-950 border-slate-800 text-slate-200 shadow-2xl" align="start">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                            <h4 className="font-semibold text-sm">Éditeur de filtres</h4>
                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30">
                                    Tout effacer
                                </Button>
                            )}
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto pr-1">
                            <GroupView
                                group={filterGroup}
                                fields={fields}
                                onChange={handleUpdate}
                                onDelete={() => clearAll()}
                                isRoot
                            />
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center">
                            <span className="text-xs text-slate-500">
                                {filterGroup.rules.length} conditions actives
                            </span>
                            <Button size="sm" onClick={() => setOpen(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white h-7 text-xs">
                                Appliquer
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Saved Views */}
                <Select onValueChange={(val) => {
                    const view = views.find(v => v.id === val);
                    if (view) {
                        setFilterGroup(view.filters);
                        if (view.groupBy && onGroupByChange) onGroupByChange(view.groupBy);
                    }
                }}>
                    <SelectTrigger className="w-8 h-8 p-0 bg-transparent border-slate-800 hover:bg-slate-800 text-slate-400 focus:ring-0 rounded-md">
                        <History size={14} />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                        {views.map(view => (
                            <SelectItem key={view.id} value={view.id}>{view.name}</SelectItem>
                        ))}
                        {views.length === 0 && <div className="p-2 text-[10px] text-slate-500">Aucune vue</div>}
                    </SelectContent>
                </Select>

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-400"
                        title="Sauvegarder la vue"
                        onClick={() => {
                            const name = prompt("Nom de la vue ?");
                            if (name) saveView(name, filterGroup, currentGroupBy);
                        }}
                    >
                        <Save size={14} />
                    </Button>
                )}

                <div className="h-4 w-px bg-slate-800 mx-1" />

                {/* Group By selector */}
                {onGroupByChange && (
                    <Select value={currentGroupBy} onValueChange={onGroupByChange}>
                        <SelectTrigger className="h-8 gap-2 bg-slate-900 border-slate-800 text-slate-400 text-xs hover:bg-slate-800 hover:text-slate-200 transition-colors focus:ring-0 min-w-[140px]">
                            <Layout size={14} className="text-indigo-500" />
                            <SelectValue placeholder="Grouper..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                            <SelectItem value="default">🎯 Smart Queues</SelectItem>
                            <div className="h-px bg-slate-800 my-1 mx-2" />
                            <div className="px-2 py-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">Champs</div>
                            {fields.map(field => (
                                <SelectItem key={field.id} value={field.id}>{field.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* 2. Active Chips */}
            {hasActiveFilters && (
                <FilterSummary group={filterGroup} fields={fields} onRemove={removeRule} />
            )}
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
        <div className={`space-y-3 ${isRoot ? '' : 'pl-4 border-l border-slate-800 pt-2'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* Links */}
                    {group.rules.length > 1 && (
                        <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800">
                            <button onClick={() => onChange({ ...group, conjunction: 'and' })} className={`px-2 py-0.5 text-[10px] rounded transition-all ${group.conjunction === 'and' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>ET</button>
                            <button onClick={() => onChange({ ...group, conjunction: 'or' })} className={`px-2 py-0.5 text-[10px] rounded transition-all ${group.conjunction === 'or' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>OU</button>
                        </div>
                    )}

                    <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={addRule} className="h-6 px-2 text-[10px] text-slate-400 hover:text-indigo-400 hover:bg-slate-900">
                            + Règle
                        </Button>
                        <Button variant="ghost" size="sm" onClick={addSubGroup} className="h-6 px-2 text-[10px] text-slate-400 hover:text-emerald-400 hover:bg-slate-900">
                            + Groupe
                        </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {group.rules.map((item) => {
                    const isGroup = 'conjunction' in item;

                    if (isGroup) {
                        return (
                            <div key={item.id} className="relative group/item">
                                <Button variant="ghost" size="sm" onClick={() => removeRuleOrGroup(item.id)} className="absolute -left-3 top-2 h-5 w-5 p-0 text-slate-600 hover:text-red-400 z-10 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    <Trash size={10} />
                                </Button>
                                <GroupView group={item as FilterGroup} fields={fields} onChange={(updated) => updateItem(item.id, updated)} onDelete={() => removeRuleOrGroup(item.id)} />
                            </div>
                        );
                    }

                    const rule = item as FilterRule;
                    const field = fields.find(f => f.id === rule.fieldId)!;
                    const operators = DEFAULT_OPERATORS[field.type];

                    return (
                        <div key={rule.id} className="flex gap-2 items-center group/rule">
                            <Select value={rule.fieldId} onValueChange={(val) => {
                                const newField = fields.find(f => f.id === val)!;
                                const newOps = DEFAULT_OPERATORS[newField.type];
                                updateItem(rule.id, { ...rule, fieldId: val, operator: newOps[0].value, value: '' });
                            }}>
                                <SelectTrigger className="h-7 w-[120px] bg-slate-900 border-transparent hover:border-slate-700 text-[11px] text-slate-300 focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                    {fields.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <Select value={rule.operator} onValueChange={(val) => updateItem(rule.id, { ...rule, operator: val as any })}>
                                <SelectTrigger className="h-7 w-[100px] bg-slate-900 border-transparent hover:border-slate-700 text-[11px] text-slate-400 focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                    {operators.map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            {!['is_empty', 'is_not_empty'].includes(rule.operator) && (
                                <div className="flex-1">
                                    {field.type === 'enum' ? (
                                        <Select value={rule.value} onValueChange={(val) => updateItem(rule.id, { ...rule, value: val })}>
                                            <SelectTrigger className="h-7 bg-slate-900 border-transparent hover:border-slate-700 text-[11px] text-slate-300 focus:ring-0">
                                                <SelectValue placeholder="Sélectionner..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                                {field.options?.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            type={field.type === 'number' ? 'number' : 'text'}
                                            className="h-7 bg-slate-900 border-transparent hover:border-slate-700 text-[11px] text-slate-300 focus-visible:ring-0"
                                            placeholder={['older_than', 'newer_than'].includes(rule.operator) ? "ex: 6m, 30d, 1y" : "Valeur..."}
                                            value={rule.value}
                                            onChange={(e) => updateItem(rule.id, { ...rule, value: e.target.value })}
                                        />
                                    )}
                                </div>
                            )}

                            <Button variant="ghost" className="h-7 w-7 p-0 text-slate-600 hover:text-red-400 opacity-0 group-hover/rule:opacity-100 transition-opacity" onClick={() => removeRuleOrGroup(rule.id)}>
                                <Trash size={12} />
                            </Button>
                        </div>
                    );
                })}
            </div>

            {group.rules.length === 0 && (
                <div onClick={addRule} className="text-[10px] text-slate-600 italic py-3 text-center border-2 border-dashed border-slate-800/50 rounded cursor-pointer hover:border-indigo-500/30 hover:text-indigo-500 transition-all">
                    + Ajouter une condition
                </div>
            )}
        </div>
    );
}

