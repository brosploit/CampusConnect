"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const admin_schemas_1 = require("./admin.schemas");
const zones_schemas_1 = require("../zones/zones.schemas");
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const constants_1 = require("../../config/constants");
const database_1 = require("../../database");
const auditLogger_1 = require("../../middleware/auditLogger");
const router = (0, express_1.Router)();
// POST /admin/zones - Create zone (Moderator & Admin)
router.post('/zones', auth_1.requireAuth, (0, rbac_1.requireRole)([constants_1.UserRole.MODERATOR, constants_1.UserRole.ADMINISTRATOR]), (0, validate_1.validateRequest)({ body: admin_schemas_1.CreateZoneSchema }), async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
        const campus = await repo.getCampusById(req.body.campusId);
        if (!campus) {
            return res.status(404).json({ error: { code: 'CAMPUS_NOT_FOUND', message: 'Target campus not found.' } });
        }
        const zone = await repo.createZone({
            campus_id: req.body.campusId,
            building_id: req.body.buildingId || null,
            name: req.body.name,
            description: req.body.description || null,
            map_geometry: req.body.mapGeometry || null,
            is_active: req.body.isActive ?? true,
        });
        const { ip, userAgent } = auditLogger_1.AuditLogger.extractReqContext(req);
        await auditLogger_1.AuditLogger.log({
            eventType: constants_1.AuditEventType.ADMIN_ZONE_CREATED,
            actorId: req.user.sub,
            actorRole: req.user.role,
            ipAddress: ip,
            userAgent,
            resourceType: 'ZONE',
            resourceId: zone.id,
            metadata: { name: zone.name, campusId: zone.campus_id },
        });
        return res.status(201).json({ zone });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /admin/zones/:zoneId - Update zone (Moderator & Admin)
router.patch('/zones/:zoneId', auth_1.requireAuth, (0, rbac_1.requireRole)([constants_1.UserRole.MODERATOR, constants_1.UserRole.ADMINISTRATOR]), (0, validate_1.validateRequest)({ params: zones_schemas_1.ZoneIdParamSchema, body: admin_schemas_1.UpdateZoneSchema }), async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
        const zone = await repo.getZoneById(req.params.zoneId);
        if (!zone) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Zone not found.' } });
        }
        const updated = await repo.updateZone(zone.id, {
            name: req.body.name,
            description: req.body.description,
            is_active: req.body.isActive,
            map_geometry: req.body.mapGeometry,
        });
        const { ip, userAgent } = auditLogger_1.AuditLogger.extractReqContext(req);
        await auditLogger_1.AuditLogger.log({
            eventType: constants_1.AuditEventType.ADMIN_ZONE_UPDATED,
            actorId: req.user.sub,
            actorRole: req.user.role,
            ipAddress: ip,
            userAgent,
            resourceType: 'ZONE',
            resourceId: zone.id,
            metadata: req.body,
        });
        return res.status(200).json({ zone: updated });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /admin/users/:userId/suspend - Administrator only
router.patch('/users/:userId/suspend', auth_1.requireAuth, (0, rbac_1.requireRole)([constants_1.UserRole.ADMINISTRATOR]), (0, validate_1.validateRequest)({ params: admin_schemas_1.UserIdParamSchema, body: admin_schemas_1.SuspendUserSchema }), async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
        const user = await repo.getUserById(req.params.userId);
        if (!user) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
        }
        // Prohibit administrators from suspending themselves
        if (user.id === req.user.sub) {
            return res.status(400).json({
                error: { code: 'INVALID_OPERATION', message: 'Administrators cannot suspend their own account.' },
            });
        }
        const updated = await repo.updateUser(user.id, {
            is_suspended: req.body.isSuspended,
            tokens_revoked_at: req.body.isSuspended ? new Date() : user.tokens_revoked_at,
        });
        // If suspended, revoke all active refresh tokens immediately
        if (req.body.isSuspended) {
            await repo.revokeAllUserRefreshTokens(user.id);
        }
        const { ip, userAgent } = auditLogger_1.AuditLogger.extractReqContext(req);
        await auditLogger_1.AuditLogger.log({
            eventType: constants_1.AuditEventType.USER_ACCOUNT_SUSPENDED,
            actorId: req.user.sub,
            actorRole: req.user.role,
            ipAddress: ip,
            userAgent,
            resourceType: 'USER',
            resourceId: user.id,
            metadata: { isSuspended: req.body.isSuspended, reason: req.body.reason },
        });
        return res.status(200).json({
            userId: updated?.id,
            isSuspended: updated?.is_suspended,
            message: req.body.isSuspended ? 'User account has been suspended.' : 'User account has been unsuspended.',
        });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /admin/users/:userId/role - Administrator only
router.patch('/users/:userId/role', auth_1.requireAuth, (0, rbac_1.requireRole)([constants_1.UserRole.ADMINISTRATOR]), (0, validate_1.validateRequest)({ params: admin_schemas_1.UserIdParamSchema, body: admin_schemas_1.UpdateUserRoleSchema }), async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
        const user = await repo.getUserById(req.params.userId);
        if (!user) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
        }
        // Prohibit demoting the last administrator or demoting oneself
        if (user.id === req.user.sub && req.body.role !== constants_1.UserRole.ADMINISTRATOR) {
            return res.status(400).json({
                error: { code: 'INVALID_OPERATION', message: 'Administrators cannot demote their own account.' },
            });
        }
        const updated = await repo.updateUser(user.id, {
            role: req.body.role,
            tokens_revoked_at: new Date(), // Revoke tokens to force fresh token with updated role
        });
        await repo.revokeAllUserRefreshTokens(user.id);
        const { ip, userAgent } = auditLogger_1.AuditLogger.extractReqContext(req);
        await auditLogger_1.AuditLogger.log({
            eventType: constants_1.AuditEventType.USER_ROLE_CHANGED,
            actorId: req.user.sub,
            actorRole: req.user.role,
            ipAddress: ip,
            userAgent,
            resourceType: 'USER',
            resourceId: user.id,
            metadata: { oldRole: user.role, newRole: req.body.role },
        });
        return res.status(200).json({
            userId: updated?.id,
            role: updated?.role,
            message: `User role updated to ${req.body.role}. Active sessions have been invalidated.`,
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /admin/audit-logs - Administrator only
router.get('/audit-logs', auth_1.requireAuth, (0, rbac_1.requireRole)([constants_1.UserRole.ADMINISTRATOR]), (0, validate_1.validateRequest)({ query: admin_schemas_1.ListAuditLogsQuerySchema }), async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
        const page = req.query.page;
        const pageSize = req.query.pageSize;
        const { logs, total } = await repo.listAuditLogs(page, pageSize);
        return res.status(200).json({
            logs,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.adminRouter = router;
