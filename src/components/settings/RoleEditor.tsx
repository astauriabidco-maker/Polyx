'use client';

import React, { useState } from 'react';
import {
    Shield,
    Plus,
    Save,
    Lock,
    ChevronRight,
    Users,
    CreditCard,
    GraduationCap,
    Settings as SettingsIcon,
    Trash2,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

// Types pour le composant
interface Permission {
    id: string;
    name: string;
    description: string;
    category: 'Finance' | 'Pédagogie' | 'Ressources Humaines' | 'Général';
}

interface Role {
    id: string;
    name: string;
    isSystemDefault: boolean;
    permissions: string[]; // liste d'IDs de permissions
}

// Données statiques pour le système (SystemPermissions)
const SYSTEM_PERMISSIONS: Permission[] = [
    { id: 'FINANCE_VIEW', name: 'Voir la Finance', description: 'Accès au CA et aux bilans financiers', category: 'Finance' },
    { id: 'FINANCE_EXPORT', name: 'Exporter BPF', description: 'Générer le Bilan Pédagogique et Financier', category: 'Finance' },
    { id: 'COURSE_EDIT', name: 'Editer Formations', description: 'Modifier le catalogue des cours', category: 'Pédagogie' },
    { id: 'COURSE_DELETE', name: 'Supprimer Formations', description: 'Supprimer définitivement des cours', category: 'Pédagogie' },
    { id: 'USER_INVITE', name: 'Inviter Utilisateurs', description: 'Envoyer des liens d\'invitation par email', category: 'Ressources Humaines' },
    { id: 'USER_ROLE_MANAGE', name: 'Gérer les Rôles', description: 'Modifier les permissions des membres', category: 'Ressources Humaines' },
    { id: 'ORG_SETTINGS', name: 'Paramètres Org', description: 'Modifier les infos de l\'organisation', category: 'Général' },
];

export function RoleEditor() {
    const [roles, setRoles] = useState<Role[]>([
        { id: '1', name: 'Super Administrateur', isSystemDefault: true, permissions: SYSTEM_PERMISSIONS.map(p => p.id) },
        { id: '2', name: 'Manager Opérationnel', isSystemDefault: false, permissions: ['COURSE_EDIT', 'USER_INVITE'] },
    ]);

    const [selectedRoleId, setSelectedRoleId] = useState<string>('1');
    const [isEditing, setIsEditing] = useState(false);

    const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

    const handleTogglePermission = (roleId: string, permissionId: string) => {
        if (selectedRole.isSystemDefault) return; // Sécurité

        setRoles(prev => prev.map(role => {
            if (role.id === roleId) {
                const hasPermission = role.permissions.includes(permissionId);
                const newPermissions = hasPermission
                    ? role.permissions.filter(id => id !== permissionId)
                    : [...role.permissions, permissionId];
                return { ...role, permissions: newPermissions };
            }
            return role;
        }));
    };

    const handleCreateRole = () => {
        const newId = Math.random().toString(36).substr(2, 9);
        const newRole: Role = {
            id: newId,
            name: 'Nouveau Rôle',
            isSystemDefault: false,
            permissions: []
        };
        setRoles([...roles, newRole]);
        setSelectedRoleId(newId);
        setIsEditing(true);
    };

    const categories: Permission['category'][] = ['Finance', 'Pédagogie', 'Ressources Humaines', 'Général'];

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'Finance': return <CreditCard size={18} className="text-emerald-500" />;
            case 'Pédagogie': return <GraduationCap size={18} className="text-blue-500" />;
            case 'Ressources Humaines': return <Users size={18} className="text-orange-500" />;
            default: return <SettingsIcon size={18} className="text-slate-500" />;
        }
    };

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
                                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                                    : 'text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`h-2 w-2 rounded-full ${role.isSystemDefault ? 'bg-rose-500' : 'bg-slate-300'}`} />
                                {role.name}
                            </div>
                            <ChevronRight size={14} className={selectedRoleId === role.id ? 'opacity-100' : 'opacity-0'} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Zone Principale: Matrice de Permissions */}
            <div className="flex-1 flex flex-col">
                {/* Header de l'éditeur */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div className="space-y-1">
                        <input
                            type="text"
                            value={selectedRole.name}
                            disabled={selectedRole.isSystemDefault}
                            onChange={(e) => {
                                const newName = e.target.value;
                                setRoles(prev => prev.map(r => r.id === selectedRole.id ? { ...r, name: newName } : r));
                            }}
                            className="text-2xl font-black text-slate-900 bg-transparent border-none p-0 focus:ring-0 w-full disabled:opacity-100"
                            placeholder="Nom du rôle..."
                        />
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                            {selectedRole.isSystemDefault ? (
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
                        {!selectedRole.isSystemDefault && (
                            <Button variant="ghost" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                                <Trash2 size={18} className="mr-2" /> Supprimer
                            </Button>
                        )}
                        <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                            <Save size={18} className="mr-2" /> Sauvegarder
                        </Button>
                    </div>
                </div>

                {/* Grille de Permissions */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10">
                    {selectedRole.isSystemDefault && (
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 text-amber-800 text-sm">
                            <AlertCircle className="shrink-0" size={20} />
                            <p>Ce rôle est un standard du système Polyx. Ses permissions sont verrouillées pour garantir la stabilité de votre organisation.</p>
                        </div>
                    )}

                    {categories.map(category => (
                        <div key={category} className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                {getCategoryIcon(category)}
                                <h4 className="font-bold text-slate-800 uppercase text-xs tracking-widest">{category}</h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {SYSTEM_PERMISSIONS.filter(p => p.category === category).map(permission => (
                                    <div
                                        key={permission.id}
                                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${selectedRole.permissions.includes(permission.id)
                                                ? 'border-indigo-100 bg-indigo-50/30'
                                                : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
                                            }`}
                                    >
                                        <div className="space-y-1 pr-4">
                                            <p className="font-bold text-slate-900 text-sm">{permission.name}</p>
                                            <p className="text-xs text-slate-500 leading-relaxed">{permission.description}</p>
                                        </div>
                                        <Switch
                                            checked={selectedRole.permissions.includes(permission.id)}
                                            disabled={selectedRole.isSystemDefault}
                                            onCheckedChange={() => handleTogglePermission(selectedRole.id, permission.id)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
