import { Request } from 'express';
import { AuditEventType } from '../config/constants';
export interface AuditContext {
    eventType: AuditEventType;
    actorId?: string | null;
    actorRole?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    resourceType?: string | null;
    resourceId?: string | null;
    metadata?: Record<string, any>;
}
export declare class AuditLogger {
    private static SENSITIVE_KEYS;
    /**
     * Redacts sensitive fields recursively from metadata objects before logging
     */
    static redact(obj: any): any;
    /**
     * Records a security audit event in the database audit log and outputs structured JSON
     */
    static log(context: AuditContext): Promise<void>;
    /**
     * Helper to extract request context for audit logging
     */
    static extractReqContext(req: Request): {
        ip: string;
        userAgent: string;
        actorId?: string;
        actorRole?: string;
    };
}
