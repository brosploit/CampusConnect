"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminIssuesRouter = exports.issuesRouter = void 0;
const express_1 = require("express");
const issues_schemas_1 = require("./issues.schemas");
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const constants_1 = require("../../config/constants");
const database_1 = require("../../database");
const auditLogger_1 = require("../../middleware/auditLogger");
const router = (0, express_1.Router)();
// POST /issues - Student creates issue report
router.post('/', auth_1.requireAuth, (0, rbac_1.requireRole)([constants_1.UserRole.STUDENT]), (0, validate_1.validateRequest)({ body: issues_schemas_1.CreateIssueSchema }), async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
        const zone = await repo.getZoneById(req.body.zoneId);
        if (!zone || !zone.is_active) {
            return res.status(400).json({ error: { code: 'INVALID_ZONE', message: 'Zone is invalid or inactive.' } });
        }
        const issue = await repo.createIssueReport({
            user_id: req.user.sub,
            zone_id: req.body.zoneId,
            category: req.body.category,
            description: req.body.description || null,
            status: constants_1.IssueReportStatus.NEW,
        });
        const { ip, userAgent } = auditLogger_1.AuditLogger.extractReqContext(req);
        await auditLogger_1.AuditLogger.log({
            eventType: constants_1.AuditEventType.ISSUE_REPORT_CREATED,
            actorId: req.user.sub,
            ipAddress: ip,
            userAgent,
            resourceType: 'ISSUE_REPORT',
            resourceId: issue.id,
        });
        return res.status(201).json({
            id: issue.id,
            zoneId: issue.zone_id,
            category: issue.category,
            status: issue.status,
            createdAt: issue.created_at,
        });
    }
    catch (err) {
        next(err);
    }
});
// Administrative Issue Endpoints Router
const adminRouter = (0, express_1.Router)();
// GET /admin/issues - Moderator & Admin listing
adminRouter.get('/issues', auth_1.requireAuth, (0, rbac_1.requireRole)([constants_1.UserRole.MODERATOR, constants_1.UserRole.ADMINISTRATOR]), (0, validate_1.validateRequest)({ query: issues_schemas_1.ListIssuesQuerySchema }), async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
        const page = req.query.page;
        const pageSize = req.query.pageSize;
        const status = req.query.status;
        const zoneId = req.query.zoneId;
        const { issues, total } = await repo.listIssueReports({
            page,
            pageSize,
            status,
            zoneId,
        });
        return res.status(200).json({
            issues: issues.map((i) => ({
                id: i.id,
                zoneId: i.zone_id,
                category: i.category,
                description: i.description,
                status: i.status,
                createdAt: i.created_at,
                reviewedBy: i.reviewed_by,
                reviewedAt: i.reviewed_at,
                adminNotes: i.admin_notes,
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
// PATCH /admin/issues/:issueId - Moderator & Admin update status
adminRouter.patch('/issues/:issueId', auth_1.requireAuth, (0, rbac_1.requireRole)([constants_1.UserRole.MODERATOR, constants_1.UserRole.ADMINISTRATOR]), (0, validate_1.validateRequest)({ params: issues_schemas_1.IssueIdParamSchema, body: issues_schemas_1.UpdateIssueSchema }), async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
        const issue = await repo.getIssueReportById(req.params.issueId);
        if (!issue) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue report not found.' } });
        }
        const updated = await repo.updateIssueReport(issue.id, {
            status: req.body.status,
            adminNotes: req.body.adminNotes,
            reviewedBy: req.user.sub,
            reviewedAt: new Date(),
        });
        const { ip, userAgent } = auditLogger_1.AuditLogger.extractReqContext(req);
        await auditLogger_1.AuditLogger.log({
            eventType: constants_1.AuditEventType.ADMIN_ISSUE_UPDATED,
            actorId: req.user.sub,
            actorRole: req.user.role,
            ipAddress: ip,
            userAgent,
            resourceType: 'ISSUE_REPORT',
            resourceId: issue.id,
            metadata: { newStatus: req.body.status },
        });
        return res.status(200).json({
            id: updated?.id,
            status: updated?.status,
            adminNotes: updated?.admin_notes,
            reviewedBy: updated?.reviewed_by,
            reviewedAt: updated?.reviewed_at,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.issuesRouter = router;
exports.adminIssuesRouter = adminRouter;
