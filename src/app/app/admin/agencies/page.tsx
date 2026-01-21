'use client';

import React from 'react';
import AgenciesTab from '../structure/_components/AgenciesTab';

export default function AgenciesPage() {
    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestion des Agences</h1>
                <p className="text-slate-500 font-medium">Gérez vos sites physiques, centres d'examens et la distribution des leads.</p>
            </div>

            <AgenciesTab />
        </div>
    );
}
