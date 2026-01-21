'use client';

import React from 'react';
import { RoleEditor } from '@/components/settings/RoleEditor';
import { useAuthStore } from '@/application/store/auth-store';
import { ShieldCheck, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function RolesPage({ hideHeader = false }: { hideHeader?: boolean }) {
    const { activeOrganization } = useAuthStore();

    return (
        <div className="space-y-6">
            {!hideHeader && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800">Matrice des Rôles</h2>
                        <p className="text-sm text-slate-500">
                            Définissez les capacités de vos collaborateurs pour {activeOrganization?.name}.
                        </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 px-4 py-3 rounded-lg flex items-start gap-3 max-w-md">
                        <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
                        <p className="text-xs text-blue-700 leading-relaxed">
                            Les modifications s'appliquent immédiatement à tous les utilisateurs rattachés.
                        </p>
                    </div>
                </div>
            )}

            {/* Editor Component */}
            <RoleEditor />

            {/* Help Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <Card className="bg-slate-50 border-slate-200 shadow-none">
                    <CardContent className="p-6">
                        <h4 className="font-bold text-slate-900 mb-2 text-sm">Qu'est-ce qu'un rôle ?</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Un rôle regroupe un ensemble de permissions techniques. Vous pouvez créer autant de rôles que nécessaire
                            (ex: "Comptable", "Directeur Pédagogique").
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-slate-200 shadow-none">
                    <CardContent className="p-6">
                        <h4 className="font-bold text-slate-900 mb-2 text-sm">Permissions Système</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Les permissions sont les briques de base de Polyx. Elles définissent précisément ce qu'un utilisateur
                            peut voir ou faire dans l'interface.
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-slate-200 shadow-none">
                    <CardContent className="p-6">
                        <h4 className="font-bold text-slate-900 mb-2 text-sm">Héritage & Sécurité</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Les administrateurs ont toujours un accès complet. Nous recommandons de suivre le principe du
                            "moindre privilège" pour vos collaborateurs.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
