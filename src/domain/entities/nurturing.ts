export enum NurturingType {
    SMS = 'SMS',
    EMAIL = 'EMAIL',
    WHATSAPP = 'WHATSAPP'
}

export enum NurturingChannel {
    WHATSAPP = 'WHATSAPP',
    SMS = 'SMS',
    EMAIL = 'EMAIL'
}

export enum NurturingEnrollmentStatus {
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export enum NurturingTaskStatus {
    PENDING = 'PENDING',
    EXECUTED = 'EXECUTED',
    CANCELLED = 'CANCELLED',
    FAILED = 'FAILED'
}

export interface NurturingSequence {
    id: string;
    organisationId: string;
    name: string;
    description?: string;
    isActive: boolean;
    steps: NurturingStep[];
    createdAt: Date;
    updatedAt: Date;
}

export interface NurturingStep {
    id: string;
    sequenceId: string;
    order: number;
    type: NurturingType;
    channel: NurturingChannel;
    delayInHours: number;
    subject?: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface NurturingEnrollment {
    id: string;
    leadId: string;
    sequenceId: string;
    status: NurturingEnrollmentStatus;
    enrolledAt: Date;
    completedAt?: Date;
    cancelledAt?: Date;
    createdAt: Date;
    updatedAt: Date;

    // Virtual or optional
    sequence?: NurturingSequence;
    tasks?: NurturingTask[];
}

export interface NurturingTask {
    id: string;
    leadId: string;
    organisationId: string;
    enrollmentId?: string;
    stepId?: string;
    type: NurturingType;
    channel: NurturingChannel;
    scheduledAt: Date;
    executedAt?: Date;
    status: NurturingTaskStatus;
    content: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
