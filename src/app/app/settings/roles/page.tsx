'use client';

import React from 'react';
import { RoleEditor } from '@/components/settings/RoleEditor';
import { useAuthStore } from '@/application/store/auth-store';
import { ShieldCheck, Info } from 'lucide-react';

export default function RolesSettingsPage() {
    const { activeOrganization } = useAuthStore();

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                        <ShieldCheck size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest">Configuration Sécurité</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Matrice des Rôles</h1>
                    <p className="text-slate-500 mt-1">
                        Définissez les capacités de vos collaborateurs pour l'organisation <span className="font-bold text-slate-700">{activeOrganization?.name}</span>.
                    </p>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3 max-w-md">
                    <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                    <p className="text-xs text-blue-700 leading-relaxed">
                        Les modifications apportées aux rôles s'appliquent immédiatement à tous les utilisateurs rattachés,
                        sans nécessiter de reconnexion.
                    </p>
                </div>
            </div>

            {/* Editor Component */}
            <RoleEditor />

            {/* Help Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-2">Qu'est-ce qu'un rôle ?</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Un rôle regroupe un ensemble de permissions techniques. Vous pouvez créer autant de rôles que nécessaire
                        (ex: "Comptable", "Directeur Pédagogique").
                    </p>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-2">Permissions Système</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Les permissions sont les briques de base de Polyx. Elles définissent précisément ce qu'un utilisateur
                        peut voir ou faire dans l'interface.
                    </p>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-2">Héritage & Sécurité</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Les administrateurs ont toujours un accès complet. Nous recommandons de suivre le principe du
                        "moindre privilège" pour vos collaborateurs.
                    </p>
                </div>
            </div>
        </div>
    );
}
