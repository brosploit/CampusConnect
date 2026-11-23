"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionIdParamSchema = exports.StartMonitoringSchema = void 0;
const zod_1 = require("zod");
const env_1 = require("../../config/env");
exports.StartMonitoringSchema = zod_1.z
    .object({
    zoneId: zod_1.z.string().uuid('Invalid zone ID format'),
    consentVersion: zod_1.z.string().min(1).max(32).regex(/^[\w\.\-]+$/),
    requestedDurationMinutes: zod_1.z
        .number()
        .int()
        .min(1)
        .max(env_1.env.MAX_MONITORING_DURATION_MINUTES, `Duration cannot exceed ${env_1.env.MAX_MONITORING_DURATION_MINUTES} minutes`)
        .default(20),
})
    .strict();
exports.SessionIdParamSchema = zod_1.z
    .object({
    sessionId: zod_1.z.string().uuid('Invalid session ID format'),
})
    .strict();
