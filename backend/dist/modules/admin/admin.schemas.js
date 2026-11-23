"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListAuditLogsQuerySchema = exports.UserIdParamSchema = exports.UpdateUserRoleSchema = exports.SuspendUserSchema = exports.UpdateZoneSchema = exports.CreateZoneSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../../config/constants");
exports.CreateZoneSchema = zod_1.z
    .object({
    campusId: zod_1.z.string().uuid('Invalid campus ID format'),
    buildingId: zod_1.z.string().uuid('Invalid building ID format').optional(),
    name: zod_1.z.string().min(1).max(100).trim(),
    description: zod_1.z.string().max(255).trim().optional(),
    mapGeometry: zod_1.z.record(zod_1.z.any()).optional(),
    isActive: zod_1.z.boolean().default(true),
})
    .strict();
exports.UpdateZoneSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(100).trim().optional(),
    description: zod_1.z.string().max(255).trim().optional(),
    isActive: zod_1.z.boolean().optional(),
    mapGeometry: zod_1.z.record(zod_1.z.any()).optional(),
})
    .strict();
exports.SuspendUserSchema = zod_1.z
    .object({
    isSuspended: zod_1.z.boolean(),
    reason: zod_1.z.string().min(1).max(255).trim(),
})
    .strict();
exports.UpdateUserRoleSchema = zod_1.z
    .object({
    role: zod_1.z.enum([constants_1.UserRole.STUDENT, constants_1.UserRole.MODERATOR, constants_1.UserRole.ADMINISTRATOR]),
})
    .strict();
exports.UserIdParamSchema = zod_1.z
    .object({
    userId: zod_1.z.string().uuid('Invalid user ID format'),
})
    .strict();
exports.ListAuditLogsQuerySchema = zod_1.z
    .object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).default(50),
})
    .strict();
