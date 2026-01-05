'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useAuthStore } from '@/application/store/auth-store';
import { Permission, ROLE_PERMISSIONS, Role } from '@/domain/entities/permission';

interface RBACGuardProps {
    requiredPermission: Permission;
    children: ReactNode;
    fallback?: ReactNode;
}

export function RBACGuard({ requiredPermission, children, fallback }: RBACGuardProps) {
    const { user, activeMembership, isLoading } = useAuthStore();
    const [isClient, setIsClient] = useState(false);

    // Hydration fix
    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient || isLoading) {
        return <div className="p-4 animate-pulse">Loading permissions...</div>;
    }

    // Check for both user and active context (membership)
    if (!user || !activeMembership) {
        return fallback ? <>{fallback}</> : <div className="p-4 text-red-500">Not Context Selected</div>;
    }

    const permissions = ROLE_PERMISSIONS[activeMembership.role as Role] || [];
    const hasAccess = permissions.includes('*') || permissions.includes(requiredPermission);

    if (!hasAccess) {
        return fallback ? <>{fallback}</> : <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">Access Denied: Missing permission {requiredPermission}</div>;
    }

    return <>{children}</>;
}
