"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringRouter = void 0;
const express_1 = require("express");
const monitoring_schemas_1 = require("./monitoring.schemas");
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const constants_1 = require("../../config/constants");
const database_1 = require("../../database");
const auditLogger_1 = require("../../middleware/auditLogger");
const objectAuth_1 = require("../../middleware/objectAuth");
const router = (0, express_1.Router)();
// POST /monitoring/sessions - Start opted-in session
router.post('/sessions', auth_1.requireAuth, (0, rbac_1.requireRole)([constants_1.UserRole.STUDENT]), (0, validate_1.validateRequest)({ body: monitoring_schemas_1.StartMonitoringSchema }), async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
        const userId = req.user.sub;
        // Validate zone exists and is active
        const zone = await repo.getZoneById(req.body.zoneId);
        if (!zone || !zone.is_active) {
            return res.status(400).json({ error: { code: 'INVALID_ZONE', message: 'Zone is invalid or inactive.' } });
        }
        // Check if user already has an active monitoring session
        const existing = await repo.getActiveMonitoringSession(userId);
        if (existing) {
            return res.status(409).json({
                error: {
                    code: 'SESSION_ALREADY_ACTIVE',
                    message: 'You already have an active monitoring session. Please stop it before starting another.',
                    activeSessionId: existing.id,
                },
            });
        }
        const durationMinutes = req.body.requestedDurationMinutes;
        const startedAt = new Date();
        const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
        const session = await repo.createMonitoringSession({
            user_id: userId,
            zone_id: req.body.zoneId,
            consent_version: req.body.consentVersion,
            consent_at: startedAt,
            started_at: startedAt,
            expires_at: expiresAt,
            status: constants_1.MonitoringSessionStatus.ACTIVE,
        });
        const { ip, userAgent } = auditLogger_1.AuditLogger.extractReqContext(req);
        await auditLogger_1.AuditLogger.log({
            eventType: constants_1.AuditEventType.MONITORING_SESSION_STARTED,
            actorId: userId,
            ipAddress: ip,
            userAgent,
            resourceType: 'MONITORING_SESSION',
            resourceId: session.id,
            metadata: { zoneId: session.zone_id, durationMinutes },
        });
        return res.status(201).json({
            sessionId: session.id,
            zoneId: session.zone_id,
            status: session.status,
            startedAt: session.started_at,
            expiresAt: session.expires_at,
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /monitoring/sessions/:sessionId/stop - BOLA protected!
router.post('/sessions/:sessionId/stop', auth_1.requireAuth, (0, validate_1.validateRequest)({ params: monitoring_schemas_1.SessionIdParamSchema }), async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
        const session = await repo.getMonitoringSessionById(req.params.sessionId);
        if (!session) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Monitoring session not found.' } });
        }
        // BOLA ownership verification: Only the session owner (or administrator) can stop it
        const isOwnerOrAdmin = (0, objectAuth_1.checkResourceOwnership)(session.user_id, req, false);
        if (!isOwnerOrAdmin && req.user.role !== constants_1.UserRole.ADMINISTRATOR) {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'You are not authorized to stop another user’s monitoring session.',
                },
            });
        }
        if (session.status !== constants_1.MonitoringSessionStatus.ACTIVE) {
            return res.status(200).json({
                sessionId: session.id,
                status: session.status,
                endedAt: session.ended_at,
                message: 'Session was already stopped or expired.',
            });
        }
        const stopped = await repo.updateMonitoringSessionStatus(session.id, constants_1.MonitoringSessionStatus.STOPPED, new Date());
        const { ip, userAgent } = auditLogger_1.AuditLogger.extractReqContext(req);
        await auditLogger_1.AuditLogger.log({
            eventType: constants_1.AuditEventType.MONITORING_SESSION_STOPPED,
            actorId: req.user.sub,
            ipAddress: ip,
            userAgent,
            resourceType: 'MONITORING_SESSION',
            resourceId: session.id,
        });
        return res.status(200).json({
            sessionId: stopped?.id,
            status: stopped?.status,
            endedAt: stopped?.ended_at,
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /monitoring/sessions/active - Get current active session
router.get('/sessions/active', auth_1.requireAuth, async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
        const session = await repo.getActiveMonitoringSession(req.user.sub);
        if (!session) {
            return res.status(200).json({ session: null });
        }
        return res.status(200).json({
            session: {
                sessionId: session.id,
                zoneId: session.zone_id,
                status: session.status,
                startedAt: session.started_at,
                expiresAt: session.expires_at,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.monitoringRouter = router;
