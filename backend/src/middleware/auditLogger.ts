import { Request, Response, NextFunction } from 'express';
import { AuditEventType } from '../config/constants';
import { getRepository } from '../database';

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

export class AuditLogger {
  private static SENSITIVE_KEYS = new Set([
    'password',
    'password_hash',
    'token',
    'access_token',
    'refresh_token',
    'authorization',
    'cookie',
    'csrf',
    'mfa_secret',
  ]);

  /**
   * Redacts sensitive fields recursively from metadata objects before logging
   */
  static redact(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.redact(item));

    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (this.SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof val === 'object' && val !== null) {
        sanitized[key] = this.redact(val);
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }

  /**
   * Records a security audit event in the database audit log and outputs structured JSON
   */
  static async log(context: AuditContext): Promise<void> {
    const sanitizedMetadata = context.metadata ? this.redact(context.metadata) : null;
    const entry = {
      event_type: context.eventType,
      actor_id: context.actorId || null,
      actor_role: context.actorRole || null,
      ip_address: context.ipAddress || null,
      user_agent: context.userAgent || null,
      resource_type: context.resourceType || null,
      resource_id: context.resourceId || null,
      metadata: sanitizedMetadata,
    };

    // Structured stdout log for log collectors / SIEM
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), audit: entry }));

    try {
      const repo = getRepository();
      await repo.createAuditLog(entry);
    } catch (err: any) {
      console.error('Failed to persist audit log to repository:', err.message);
    }
  }

  /**
   * Helper to extract request context for audit logging
   */
  static extractReqContext(req: Request): { ip: string; userAgent: string; actorId?: string; actorRole?: string } {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const user = (req as any).user;
    return {
      ip,
      userAgent,
      actorId: user?.sub,
      actorRole: user?.role,
    };
  }
}
