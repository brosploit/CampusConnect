"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListMineReadingsQuerySchema = exports.BatchReadingSchema = exports.SingleReadingSchema = exports.NetworkContextSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../../config/constants");
const env_1 = require("../../config/env");
// Prohibit collection of persistent hardware identifiers or GPS
const ProhibitedKeys = ['imei', 'imsi', 'sim', 'mac', 'latitude', 'longitude', 'gps', 'phone', 'phonenumber'];
exports.NetworkContextSchema = zod_1.z
    .object({
    serviceState: zod_1.z.enum(['IN_SERVICE', 'OUT_OF_SERVICE', 'EMERGENCY_ONLY', 'POWER_OFF']).nullable().optional(),
    signalDbm: zod_1.z.number().int().min(-150).max(0).nullable().optional(),
    radioTechnology: zod_1.z.string().max(32).regex(/^[\w\s\.\-]+$/).nullable().optional(),
    carrierLabel: zod_1.z.string().max(64).regex(/^[\w\s\.\-]+$/).nullable().optional(),
    activeTransport: zod_1.z.string().max(32).regex(/^[\w\-]+$/).nullable().optional(),
    internetCapability: zod_1.z.boolean().nullable().optional(),
    internetValidated: zod_1.z.boolean().nullable().optional(),
    dataFreshness: zod_1.z.enum(['FRESH', 'CACHED', 'UNKNOWN']).nullable().optional(),
})
    .strict();
exports.SingleReadingSchema = zod_1.z
    .object({
    readingId: zod_1.z.string().uuid('Invalid reading idempotency ID'),
    zoneId: zod_1.z.string().uuid('Invalid zone ID'),
    networkType: zod_1.z.enum([constants_1.NetworkType.WIFI, constants_1.NetworkType.MOBILE, constants_1.NetworkType.OTHER, constants_1.NetworkType.UNKNOWN]),
    downloadMbps: zod_1.z.number().min(0).max(10000).nullable().optional(),
    latencyMs: zod_1.z.number().min(0).max(60000).nullable().optional(),
    measurementSource: zod_1.z.enum([
        constants_1.MeasurementSource.APP_TEST,
        constants_1.MeasurementSource.MANUAL,
        constants_1.MeasurementSource.IMPORTED,
        constants_1.MeasurementSource.DEMO,
    ]),
    clientMeasuredAt: zod_1.z.string().datetime().refine((val) => {
        const measured = new Date(val).getTime();
        const now = Date.now();
        // Allow up to 7 days in the past (offline queue) and 5 minutes in the future (clock skew)
        return measured <= now + 300000 && measured >= now - 7 * 86400000;
    }, { message: 'Measurement timestamp outside permissible offline window (max 7 days past, 5 min future)' }),
    appVersion: zod_1.z.string().max(32).regex(/^[\w\.\-]+$/).optional(),
    platformVersion: zod_1.z.string().max(32).regex(/^[\w\.\-\s]+$/).optional(),
    networkContext: exports.NetworkContextSchema.optional(),
})
    .strict();
exports.BatchReadingSchema = zod_1.z
    .object({
    readings: zod_1.z
        .array(exports.SingleReadingSchema)
        .min(1, 'Batch must contain at least one reading')
        .max(env_1.env.MAX_BATCH_SIZE, `Batch size cannot exceed ${env_1.env.MAX_BATCH_SIZE} readings`),
})
    .strict();
exports.ListMineReadingsQuerySchema = zod_1.z
    .object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(50).default(20),
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
    zoneId: zod_1.z.string().uuid().optional(),
})
    .strict();
