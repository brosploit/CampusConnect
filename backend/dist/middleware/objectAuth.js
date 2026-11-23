"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkResourceOwnership = checkResourceOwnership;
const constants_1 = require("../config/constants");
const auditLogger_1 = require("./auditLogger");
/**
 * Object-Level Authorization (BOLA / IDOR Defense)
 * Verifies that the authenticated user is either the resource owner
 * or possesses supervisory role privileges (moderator/administrator).
 */
function checkResourceOwnership(resourceOwnerId, req, allowModerator = false) {
    const user = req.user;
    if (!user)
        return false;
    // Direct owner match
    if (user.sub === resourceOwnerId) {
        return true;
    }
    // Supervisory override where appropriate (e.g., moderator reviewing an issue)
    if (allowModerator && (user.role === constants_1.UserRole.MODERATOR || user.role === constants_1.UserRole.ADMINISTRATOR)) {
        return true;
    }
    // Log unauthorized object-level access attempt
    const { ip, userAgent } = auditLogger_1.AuditLogger.extractReqContext(req);
    auditLogger_1.AuditLogger.log({
        eventType: constants_1.AuditEventType.AUTHZ_FAILURE,
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
    }).catch(() => { });
    return false;
}
