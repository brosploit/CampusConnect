"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
const constants_1 = require("../config/constants");
const auditLogger_1 = require("./auditLogger");
/**
 * Enforces Role-Based Access Control (RBAC).
 * Prohibits unauthorized users from invoking function-level operations (BFLA defense).
 */
function requireRole(allowedRoles) {
    return async (req, res, next) => {
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
            const { ip, userAgent } = auditLogger_1.AuditLogger.extractReqContext(req);
            await auditLogger_1.AuditLogger.log({
                eventType: constants_1.AuditEventType.AUTHZ_FAILURE,
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
        if (user.role === constants_1.UserRole.ADMINISTRATOR && user.mfaVerified === false) {
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
