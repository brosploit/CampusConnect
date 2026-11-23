"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateIssueSchema = exports.ListIssuesQuerySchema = exports.IssueIdParamSchema = exports.CreateIssueSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../../config/constants");
exports.CreateIssueSchema = zod_1.z
    .object({
    zoneId: zod_1.z.string().uuid('Invalid zone ID format'),
    category: zod_1.z.string().min(1).max(64).regex(/^[\w\s\.\-]+$/),
    description: zod_1.z.string().max(500, 'Description cannot exceed 500 characters').trim().optional(),
})
    .strict();
exports.IssueIdParamSchema = zod_1.z
    .object({
    issueId: zod_1.z.string().uuid('Invalid issue ID format'),
})
    .strict();
exports.ListIssuesQuerySchema = zod_1.z
    .object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(50).default(20),
    status: zod_1.z.enum([
        constants_1.IssueReportStatus.NEW,
        constants_1.IssueReportStatus.REVIEWING,
        constants_1.IssueReportStatus.RESOLVED,
        constants_1.IssueReportStatus.DISMISSED,
    ]).optional(),
    zoneId: zod_1.z.string().uuid().optional(),
})
    .strict();
exports.UpdateIssueSchema = zod_1.z
    .object({
    status: zod_1.z.enum([
        constants_1.IssueReportStatus.NEW,
        constants_1.IssueReportStatus.REVIEWING,
        constants_1.IssueReportStatus.RESOLVED,
        constants_1.IssueReportStatus.DISMISSED,
    ]),
    adminNotes: zod_1.z.string().max(500).trim().optional(),
})
    .strict();
