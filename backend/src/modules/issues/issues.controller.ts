import { Router, Request, Response, NextFunction } from 'express';
import {
  CreateIssueSchema,
  IssueIdParamSchema,
  ListIssuesQuerySchema,
  UpdateIssueSchema,
} from './issues.schemas';
import { validateRequest } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserRole, AuditEventType, IssueReportStatus } from '../../config/constants';
import { getRepository } from '../../database';
import { AuditLogger } from '../../middleware/auditLogger';

const router = Router();

// POST /issues - Student creates issue report
router.post(
  '/',
  requireAuth,
  requireRole([UserRole.STUDENT]),
  validateRequest({ body: CreateIssueSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = getRepository();
      const zone = await repo.getZoneById(req.body.zoneId);
      if (!zone || !zone.is_active) {
        return res.status(400).json({ error: { code: 'INVALID_ZONE', message: 'Zone is invalid or inactive.' } });
      }

      const issue = await repo.createIssueReport({
        user_id: req.user!.sub,
        zone_id: req.body.zoneId,
        category: req.body.category,
        description: req.body.description || null,
        status: IssueReportStatus.NEW,
      });

      const { ip, userAgent } = AuditLogger.extractReqContext(req);
      await AuditLogger.log({
        eventType: AuditEventType.ISSUE_REPORT_CREATED,
        actorId: req.user!.sub,
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
    } catch (err) {
      next(err);
    }
  }
);

// Administrative Issue Endpoints Router
const adminRouter = Router();

// GET /admin/issues - Moderator & Admin listing
adminRouter.get(
  '/issues',
  requireAuth,
  requireRole([UserRole.MODERATOR, UserRole.ADMINISTRATOR]),
  validateRequest({ query: ListIssuesQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = getRepository();
      const page = req.query.page as any;
      const pageSize = req.query.pageSize as any;
      const status = req.query.status as any;
      const zoneId = req.query.zoneId as any;

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
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /admin/issues/:issueId - Moderator & Admin update status
adminRouter.patch(
  '/issues/:issueId',
  requireAuth,
  requireRole([UserRole.MODERATOR, UserRole.ADMINISTRATOR]),
  validateRequest({ params: IssueIdParamSchema, body: UpdateIssueSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = getRepository();
      const issue = await repo.getIssueReportById(req.params.issueId);
      if (!issue) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue report not found.' } });
      }

      const updated = await repo.updateIssueReport(issue.id, {
        status: req.body.status,
        adminNotes: req.body.adminNotes,
        reviewedBy: req.user!.sub,
        reviewedAt: new Date(),
      });

      const { ip, userAgent } = AuditLogger.extractReqContext(req);
      await AuditLogger.log({
        eventType: AuditEventType.ADMIN_ISSUE_UPDATED,
        actorId: req.user!.sub,
        actorRole: req.user!.role,
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
    } catch (err) {
      next(err);
    }
  }
);

export const issuesRouter = router;
export const adminIssuesRouter = adminRouter;
