'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LeadsPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the Pipeline submenu by default
        router.replace('/app/leads/pipeline');
    }, [router]);

    return (
        <div className="p-8 text-center text-slate-500">
            Redirection vers le Pipeline...
        </div>
    );
}
