'use client';

import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
    ColumnDef,
    SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { LeadWithOrg } from '@/domain/entities/lead';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    ChevronDown,
    MoreHorizontal,
    Phone,
    Mail,
    ArrowUpDown,
    Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LeadsListViewProps {
    leads: any[];
    onLeadClick: (lead: any) => void;
    selectedIds: string[];
    onToggleSelect: (id: string, multi?: boolean) => void;
    onSelectAll: (ids: string[]) => void;
}

export function LeadsListView({ leads, onLeadClick, selectedIds, onToggleSelect, onSelectAll }: LeadsListViewProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState({});

    // Columns
    const columns: ColumnDef<any>[] = [
        {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value: boolean) => {
                        table.toggleAllPageRowsSelected(!!value);
                        if (value) {
                            onSelectAll(table.getRowModel().rows.map(row => row.original.id));
                        } else {
                            onSelectAll([]); // Should ideally clear
                        }
                    }}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={selectedIds.includes(row.original.id)}
                    onCheckedChange={(value: boolean) => onToggleSelect(row.original.id)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'identity',
            header: ({ column }) => {
                return (
                    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                        Contact
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const l = row.original;
                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-200">{l.firstName} {l.lastName}</span>
                        <span className="text-xs text-slate-500">{l.organizationName}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'status',
            header: 'Statut',
            cell: ({ row }) => <Badge variant="outline">{row.getValue('status')}</Badge>,
        },
        {
            accessorKey: 'score',
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Score
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const score = parseInt(row.getValue('score'));
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${score > 70 ? 'bg-emerald-500' : score > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${score}%` }}
                            />
                        </div>
                        <span className="text-xs font-mono text-slate-500">{score}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'contact',
            header: 'Coordonnées',
            cell: ({ row }) => {
                const l = row.original;
                return (
                    <div className="flex gap-2 text-slate-400">
                        {l.phone && <Phone size={14} className="hover:text-indigo-600 cursor-pointer" />}
                        {l.email && <Mail size={14} className="hover:text-indigo-600 cursor-pointer" />}
                    </div>
                );
            },
        },
        {
            accessorKey: 'createdAt',
            header: 'Date d\'entrée',
            cell: ({ row }) => (
                <span className="text-xs text-slate-500">
                    {format(new Date(row.getValue('createdAt')), 'dd MMM yyyy', { locale: fr })}
                </span>
            ),
        }
    ];

    const table = useReactTable({
        data: leads,
        columns,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
    });

    return (
        <div className="rounded-md border border-slate-800 bg-slate-900 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                <Table>
                    <TableHeader className="bg-slate-900 sticky top-0 z-10 shadow-sm border-b border-slate-800">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-slate-900 border-none">
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="text-slate-400 font-medium text-xs uppercase tracking-wider h-10">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="hover:bg-slate-800/50 cursor-pointer border-slate-800 transition-colors data-[state=selected]:bg-indigo-900/20 data-[state=selected]:border-indigo-500/30"
                                    onClick={(e) => {
                                        // Prevent click if clicking checkbox or action button
                                        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[role="checkbox"]')) return;
                                        onLeadClick(row.original);
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-2.5 text-slate-300">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                                    Aucun résultat.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
