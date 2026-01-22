'use client';

import React from 'react';
import { OrganizationTab } from '../structure/_components/OrganizationTab';

export default function ProfilePage() {
    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Profil & Identité</h1>
                <p className="text-slate-500 font-medium">Configurez l'identité légale, les certifications et le branding de votre organisme.</p>
            </div>

            <OrganizationTab />
        </div>
    );
}
