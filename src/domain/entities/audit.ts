export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    ACCESS = 'ACCESS', // For sensitive data access (GDPR)
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    EXPORT = 'EXPORT', // Data export
}

export interface AuditLogEntry {
    id: string; // UUID
    timestamp: Date;

    // Context
    organizationId: string;
    userId: string;
    userRole: string; // Snapshot of role at time of action
    ipAddress?: string;
    userAgent?: string;

    // Action
    action: AuditAction;
    resource: string; // e.g., 'leads', 'student-file', 'user'
    resourceId: string;

    // Data State
    changes?: {
        field: string;
        oldValue: any;
        newValue: any;
    }[];

    description?: string; // Human readable description
    metadata?: Record<string, any>;
}
