import { Request, Response, NextFunction } from 'express';
import { UserRole, AuditEventType } from '../config/constants';
import { AuditLogger } from './auditLogger';

/**
 * Object-Level Authorization (BOLA / IDOR Defense)
 * Verifies that the authenticated user is either the resource owner
 * or possesses supervisory role privileges (moderator/administrator).
 */
export function checkResourceOwnership(
  resourceOwnerId: string,
  req: Request,
  allowModerator = false
): boolean {
  const user = req.user;
  if (!user) return false;

  // Direct owner match
  if (user.sub === resourceOwnerId) {
    return true;
  }

  // Supervisory override where appropriate (e.g., moderator reviewing an issue)
  if (allowModerator && (user.role === UserRole.MODERATOR || user.role === UserRole.ADMINISTRATOR)) {
    return true;
  }

  // Log unauthorized object-level access attempt
  const { ip, userAgent } = AuditLogger.extractReqContext(req);
  AuditLogger.log({
    eventType: AuditEventType.AUTHZ_FAILURE,
    actorId: user.sub,
    actorRole: user.role,
    ipAddress: ip,
    userAgent,
    resourceType: 'OBJECT_OWNERSHIP_CHECK',
    resourceId: resourceOwnerId,
    metadata: {
      action: req.method,
      endpoint: req.originalUrl,
      reason: 'BOLA_OWNERSHIP_MISMATCH',
    },
  }).catch(() => {});

  return false;
}
