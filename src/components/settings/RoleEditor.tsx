'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Shield,
    Plus,
    Save,
    Lock,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Trash2,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/application/store/auth-store';
import { toast } from '@/components/ui/use-toast';
import { APP_MODULES } from '@/application/config/modules.config';
import {
    getRolesAction,
    createRoleAction,
    updateRoleAction,
    deleteRoleAction
} from '@/application/actions/role.actions';
import { syncSystemPermissionsAction } from '@/application/actions/sync-permissions';

interface Role {
    id: string;
    name: string;
    isSystem: boolean;
    permissions: string[];
    userCount?: number;
}

export function RoleEditor() {
    const { activeOrganization } = useAuthStore();
    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

    const loadData = useCallback(async () => {
        if (!activeOrganization?.id) return;
        setIsLoading(true);

        // 1. Sync permissions with DB first to ensure everything is up to date
        await syncSystemPermissionsAction();

        // 2. Load roles
        const res = await getRolesAction(activeOrganization.id);
        if (res.success && res.roles) {
            setRoles(res.roles);
            if (res.roles.length > 0 && !selectedRoleId) {
                setSelectedRoleId(res.roles[0].id);
            }
        }
        setIsLoading(false);
    }, [activeOrganization?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const selectedRole = roles.find(r => r.id === selectedRoleId);

    const handleTogglePermission = (permissionId: string) => {
        if (!selectedRole || selectedRole.isSystem) return;

        setRoles(prev => prev.map(role => {
            if (role.id === selectedRoleId) {
                const hasPermission = role.permissions.includes(permissionId);
                const newPermissions = hasPermission
                    ? role.permissions.filter(id => id !== permissionId)
                    : [...role.permissions, permissionId];
                return { ...role, permissions: newPermissions };
            }
            return role;
        }));
    };

    const handleSave = async () => {
        if (!selectedRole || !activeOrganization?.id) return;
        setIsSaving(true);

        const formData = new FormData();
        formData.append('name', selectedRole.name);
        selectedRole.permissions.forEach(p => formData.append('permissions', p));

        const res = await updateRoleAction(activeOrganization.id, selectedRole.id, formData);
        if (res.success) {
            toast({ title: "Sauvegardé", description: "Le rôle a été mis à jour avec succès." });
            loadData();
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleCreateRole = async () => {
        if (!activeOrganization?.id) return;
        const name = prompt("Nom du nouveau rôle :");
        if (!name) return;

        const formData = new FormData();
        formData.append('name', name);

        const res = await createRoleAction(activeOrganization.id, formData);
        if (res.success && res.role) {
            toast({ title: "Rôle créé", description: "Vous pouvez maintenant configurer ses permissions." });
            await loadData();
            setSelectedRoleId(res.role.id);
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
    };

    const handleDeleteRole = async () => {
        if (!selectedRole || !activeOrganization?.id) return;
        if (!confirm(`Supprimer le rôle "${selectedRole.name}" ?`)) return;

        const res = await deleteRoleAction(activeOrganization.id, selectedRole.id);
        if (res.success) {
            toast({ title: "Supprimé", description: "Le rôle a été supprimé." });
            setSelectedRoleId('');
            loadData();
        } else {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
        }
    };

    const toggleModule = (moduleId: string) => {
        setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
    };

    if (isLoading && roles.length === 0) {
        return (
            <div className="h-[600px] bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
                <p className="text-slate-500 font-medium tracking-wide">Initialisation de la matrice...</p>
            </div>
        );
    }

    return (
        <div className="flex bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm min-h-[600px]">
            {/* Colonne Gauche: Liste des Rôles */}
            <div className="w-72 border-r border-slate-100 flex flex-col bg-slate-50/50">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Shield size={18} className="text-indigo-600" />
                        Rôles
                    </h3>
                    <button
                        onClick={handleCreateRole}
                        className="p-1.5 hover:bg-white rounded-lg text-indigo-600 border border-transparent hover:border-slate-200 transition-all"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {roles.map(role => (
                        <button
                            key={role.id}
                            onClick={() => setSelectedRoleId(role.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all ${selectedRoleId === role.id
                                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200 font-bold'
                                : 'text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`h-2 w-2 rounded-full ${role.isSystem ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                <span className="truncate max-w-[160px]">{role.name}</span>
                            </div>
                            <ChevronRight size={14} className={selectedRoleId === role.id ? 'opacity-100' : 'opacity-0'} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Zone Principale: Matrice de Permissions */}
            <div className="flex-1 flex flex-col">
                {selectedRole ? (
                    <>
                        {/* Header de l'éditeur */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div className="space-y-1">
                                <input
                                    type="text"
                                    value={selectedRole.name}
                                    disabled={selectedRole.isSystem}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        setRoles(prev => prev.map(r => r.id === selectedRole.id ? { ...r, name: newName } : r));
                                    }}
                                    className="text-2xl font-black text-slate-900 bg-transparent border-none p-0 focus:ring-0 w-full disabled:opacity-100"
                                    placeholder="Nom du rôle..."
                                />
                                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                    {selectedRole.isSystem ? (
                                        <span className="flex items-center gap-1.5 text-rose-500 bg-rose-50 px-2 py-0.5 rounded">
                                            <Lock size={12} /> Rôle Système Immuable
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5">
                                            {selectedRole.permissions.length} Permissions actives
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {!selectedRole.isSystem && (
                                    <Button
                                        variant="ghost"
                                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                        onClick={handleDeleteRole}
                                    >
                                        <Trash2 size={18} className="mr-2" /> Supprimer
                                    </Button>
                                )}
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                                    onClick={handleSave}
                                    disabled={isSaving || selectedRole.isSystem}
                                >
                                    {isSaving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
                                    Sauvegarder
                                </Button>
                            </div>
                        </div>

                        {/* Grille de Permissions */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10">
                            {selectedRole.isSystem && (
                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 text-amber-800 text-sm mb-6">
                                    <AlertCircle className="shrink-0" size={20} />
                                    <p>Ce rôle est un standard du système Polyx. Ses permissions sont verrouillées pour garantir la stabilité de votre organisation.</p>
                                </div>
                            )}

                            {APP_MODULES.map(category => (
                                <div key={category.name} className="space-y-6">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <div className={`text-sm font-black uppercase tracking-[0.2em] ${category.color}`}>
                                            {category.name}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {category.modules.map(module => {
                                            const isExpanded = expandedModules[module.id];
                                            const hasSubItems = module.subItems && module.subItems.length > 0;
                                            const isModuleActive = selectedRole.permissions.includes(module.id);

                                            return (
                                                <div key={module.id} className="space-y-2">
                                                    <div
                                                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${isModuleActive
                                                            ? 'border-indigo-100 bg-indigo-50/20'
                                                            : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-4 flex-1">
                                                            <div className={`p-2 rounded-xl ${isModuleActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                                                                <module.icon size={20} />
                                                            </div>
                                                            <div className="space-y-0.5 pr-4">
                                                                <p className="font-bold text-slate-900 text-sm">{module.name}</p>
                                                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Accès Principal</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            {hasSubItems && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 px-2 text-slate-400 hover:text-indigo-600"
                                                                    onClick={() => toggleModule(module.id)}
                                                                >
                                                                    {module.subItems?.length} sous-menus
                                                                    {isExpanded ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
                                                                </Button>
                                                            )}
                                                            <Switch
                                                                checked={isModuleActive}
                                                                disabled={selectedRole.isSystem}
                                                                onCheckedChange={() => handleTogglePermission(module.id)}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Evolution: Sous-menus dynamiques */}
                                                    {hasSubItems && isExpanded && (
                                                        <div className="ml-12 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
                                                            {module.subItems?.map(subItem => {
                                                                const isSubActive = selectedRole.permissions.includes(subItem.id);
                                                                return (
                                                                    <div
                                                                        key={subItem.id}
                                                                        className={`p-3 px-4 rounded-xl border transition-all flex items-center justify-between ${isSubActive
                                                                            ? 'border-indigo-100 bg-indigo-50/40'
                                                                            : 'border-slate-100 bg-slate-50/30'}`}
                                                                    >
                                                                        <div className="space-y-0.5">
                                                                            <p className="font-medium text-slate-800 text-xs">{subItem.name}</p>
                                                                            <p className="text-[9px] text-slate-400 italic">Sous-menu spécifique</p>
                                                                        </div>
                                                                        <Switch
                                                                            checked={isSubActive}
                                                                            disabled={selectedRole.isSystem || !isModuleActive}
                                                                            onCheckedChange={() => handleTogglePermission(subItem.id)}
                                                                            className="scale-75 origin-right"
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                        <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6 font-black text-4xl">R</div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Sélectionnez un rôle</h3>
                        <p className="text-slate-500 max-w-xs leading-relaxed">
                            Choisissez un rôle dans la liste latérale pour configurer ses accès ou créez-en un nouveau.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
