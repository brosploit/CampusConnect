"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZoneAnalyticsQuerySchema = exports.HeatmapQuerySchema = exports.CampusIdParamSchema = exports.ZoneIdParamSchema = exports.ListZonesQuerySchema = void 0;
const zod_1 = require("zod");
exports.ListZonesQuerySchema = zod_1.z
    .object({
    active: zod_1.z.enum(['true', 'false']).optional(),
})
    .strict();
exports.ZoneIdParamSchema = zod_1.z
    .object({
    zoneId: zod_1.z.string().uuid('Invalid zone ID format'),
})
    .strict();
exports.CampusIdParamSchema = zod_1.z
    .object({
    campusId: zod_1.z.string().uuid('Invalid campus ID format'),
})
    .strict();
exports.HeatmapQuerySchema = zod_1.z
    .object({
    metric: zod_1.z.enum(['download', 'latency', 'reliability']).default('download'),
    networkType: zod_1.z.enum(['WIFI', 'MOBILE', 'OTHER', 'UNKNOWN']).optional(),
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
    bucket: zod_1.z.enum(['hour', 'day', 'week']).default('day'),
})
    .strict();
exports.ZoneAnalyticsQuerySchema = zod_1.z
    .object({
    metric: zod_1.z.enum(['download', 'latency', 'reliability']).default('download'),
    networkType: zod_1.z.enum(['WIFI', 'MOBILE', 'OTHER', 'UNKNOWN']).optional(),
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
})
    .strict();
