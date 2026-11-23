"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readingsRouter = void 0;
const express_1 = require("express");
const readings_service_1 = require("./readings.service");
const readings_schemas_1 = require("./readings.schemas");
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const constants_1 = require("../../config/constants");
const database_1 = require("../../database");
const auditLogger_1 = require("../../middleware/auditLogger");
const env_1 = require("../../config/env");
const router = (0, express_1.Router)();
// Rate limiter for single reading submissions: 10 requests / minute
const readingRateLimiter = rateLimiter_1.RateLimiter.create({
    max: env_1.env.RATE_LIMIT_READINGS_MAX,
    windowMs: env_1.env.RATE_LIMIT_READINGS_WINDOW_MS,
    keyPrefix: 'reading',
});
// Rate limiter for batch reading submissions: 5 requests / minute
const batchRateLimiter = rateLimiter_1.RateLimiter.create({
    max: env_1.env.RATE_LIMIT_BATCH_MAX,
    windowMs: env_1.env.RATE_LIMIT_BATCH_WINDOW_MS,
    keyPrefix: 'batch',
});
// POST /readings - Student submission
router.post('/', auth_1.requireAuth, (0, rbac_1.requireRole)([constants_1.UserRole.STUDENT]), readingRateLimiter, (0, validate_1.validateRequest)({ body: readings_schemas_1.SingleReadingSchema }), async (req, res, next) => {
    try {
        const { ip, userAgent } = auditLogger_1.AuditLogger.extractReqContext(req);
        const result = await readings_service_1.ReadingsService.submitReading({
            userId: req.user.sub,
            reading: req.body,
            ipAddress: ip,
            userAgent,
        });
        return res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
});
// POST /readings/batch - Student offline sync submission
router.post('/batch', auth_1.requireAuth, (0, rbac_1.requireRole)([constants_1.UserRole.STUDENT]), batchRateLimiter, (0, validate_1.validateRequest)({ body: readings_schemas_1.BatchReadingSchema }), async (req, res, next) => {
    try {
        const { ip, userAgent } = auditLogger_1.AuditLogger.extractReqContext(req);
        const result = await readings_service_1.ReadingsService.submitBatch({
            userId: req.user.sub,
            readings: req.body.readings,
            ipAddress: ip,
            userAgent,
        });
        return res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
});
// GET /readings/mine - BOLA protected personal history
router.get('/mine', auth_1.requireAuth, (0, rbac_1.requireRole)([constants_1.UserRole.STUDENT]), (0, validate_1.validateRequest)({ query: readings_schemas_1.ListMineReadingsQuerySchema }), async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
        const page = req.query.page;
        const pageSize = req.query.pageSize;
        const from = req.query.from ? new Date(req.query.from) : undefined;
        const to = req.query.to ? new Date(req.query.to) : undefined;
        const zoneId = req.query.zoneId;
        // Strictly binds to authenticated student ID (req.user.sub)
        const { readings, total } = await repo.listReadingsForUser(req.user.sub, {
            page,
            pageSize,
            from,
            to,
            zoneId,
        });
        return res.status(200).json({
            readings: readings.map((r) => ({
                readingId: r.reading_id,
                zoneId: r.zone_id,
                networkType: r.network_type,
                downloadMbps: r.download_mbps,
                latencyMs: r.latency_ms,
                measurementSource: r.measurement_source,
                clientMeasuredAt: r.client_measured_at,
                validationStatus: r.validation_status,
            })),
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
exports.readingsRouter = router;
