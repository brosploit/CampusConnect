import { Router, Request, Response, NextFunction } from 'express';
import { StartMonitoringSchema, SessionIdParamSchema } from './monitoring.schemas';
import { validateRequest } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserRole, MonitoringSessionStatus, AuditEventType } from '../../config/constants';
import { getRepository } from '../../database';
import { AuditLogger } from '../../middleware/auditLogger';
import { checkResourceOwnership } from '../../middleware/objectAuth';

const router = Router();

// POST /monitoring/sessions - Start opted-in session
router.post(
  '/sessions',
  requireAuth,
  requireRole([UserRole.STUDENT]),
  validateRequest({ body: StartMonitoringSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = getRepository();
      const userId = req.user!.sub;

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
        status: MonitoringSessionStatus.ACTIVE,
      });

      const { ip, userAgent } = AuditLogger.extractReqContext(req);
      await AuditLogger.log({
        eventType: AuditEventType.MONITORING_SESSION_STARTED,
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
    } catch (err) {
      next(err);
    }
  }
);

// POST /monitoring/sessions/:sessionId/stop - BOLA protected!
router.post(
  '/sessions/:sessionId/stop',
  requireAuth,
  validateRequest({ params: SessionIdParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = getRepository();
      const session = await repo.getMonitoringSessionById(req.params.sessionId);

      if (!session) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Monitoring session not found.' } });
      }

      // BOLA ownership verification: Only the session owner (or administrator) can stop it
      const isOwnerOrAdmin = checkResourceOwnership(session.user_id, req, false);
      if (!isOwnerOrAdmin && req.user!.role !== UserRole.ADMINISTRATOR) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You are not authorized to stop another user’s monitoring session.',
          },
        });
      }

      if (session.status !== MonitoringSessionStatus.ACTIVE) {
        return res.status(200).json({
          sessionId: session.id,
          status: session.status,
          endedAt: session.ended_at,
          message: 'Session was already stopped or expired.',
        });
      }

      const stopped = await repo.updateMonitoringSessionStatus(session.id, MonitoringSessionStatus.STOPPED, new Date());

      const { ip, userAgent } = AuditLogger.extractReqContext(req);
      await AuditLogger.log({
        eventType: AuditEventType.MONITORING_SESSION_STOPPED,
        actorId: req.user!.sub,
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
    } catch (err) {
      next(err);
    }
  }
);

// GET /monitoring/sessions/active - Get current active session
router.get('/sessions/active', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = getRepository();
    const session = await repo.getActiveMonitoringSession(req.user!.sub);
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
  } catch (err) {
    next(err);
  }
});

export const monitoringRouter = router;
