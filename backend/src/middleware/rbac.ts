import { Request, Response, NextFunction } from 'express';
import { UserRole, AuditEventType } from '../config/constants';
import { AuditLogger } from './auditLogger';

/**
 * Enforces Role-Based Access Control (RBAC).
 * Prohibits unauthorized users from invoking function-level operations (BFLA defense).
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required to access this resource.',
        },
      });
    }

    if (!allowedRoles.includes(user.role)) {
      const { ip, userAgent } = AuditLogger.extractReqContext(req);
      await AuditLogger.log({
        eventType: AuditEventType.AUTHZ_FAILURE,
        actorId: user.sub,
        actorRole: user.role,
        ipAddress: ip,
        userAgent,
        resourceType: 'ENDPOINT',
        resourceId: req.originalUrl,
        metadata: {
          allowedRoles,
          userRole: user.role,
          method: req.method,
          path: req.path,
        },
      });

      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have the required role privileges to access this resource.',
        },
      });
    }

    // Require MFA verification for Administrator role
    if (user.role === UserRole.ADMINISTRATOR && user.mfaVerified === false) {
      return res.status(403).json({
        error: {
          code: 'MFA_VERIFICATION_REQUIRED',
          message: 'Multi-Factor Authentication verification is required for administrator accounts.',
        },
      });
    }

    next();
  };
}
