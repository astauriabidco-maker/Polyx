import { AuditLogEntry, AuditAction } from '@/domain/entities/audit';

// This would typically be a singleton that interacts with a database or external audit service
export class AuditService {
    static async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
        const fullEntry: AuditLogEntry = {
            ...entry,
            id: crypto.randomUUID(),
            timestamp: new Date(),
        };

        // TODO: Real implementation would write to DB asynchronously
        // We use console.log here to demonstrate the capture of events
        console.log('[AUDIT_LOG_SECURE]', JSON.stringify(fullEntry));
    }

    static async logAction(
        userId: string,
        userRole: string,
        organizationId: string,
        action: AuditAction,
        resource: string,
        resourceId: string,
        changes?: any
    ) {
        await this.log({
            userId,
            userRole,
            organizationId,
            action,
            resource,
            resourceId,
            changes
        });
    }
}
