import { Router, Request, Response, NextFunction } from 'express';
import { ReadingsService } from './readings.service';
import {
  SingleReadingSchema,
  BatchReadingSchema,
  ListMineReadingsQuerySchema,
} from './readings.schemas';
import { validateRequest } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { RateLimiter } from '../../middleware/rateLimiter';
import { UserRole } from '../../config/constants';
import { getRepository } from '../../database';
import { AuditLogger } from '../../middleware/auditLogger';
import { env } from '../../config/env';

const router = Router();

// Rate limiter for single reading submissions: 10 requests / minute
const readingRateLimiter = RateLimiter.create({
  max: env.RATE_LIMIT_READINGS_MAX,
  windowMs: env.RATE_LIMIT_READINGS_WINDOW_MS,
  keyPrefix: 'reading',
});

// Rate limiter for batch reading submissions: 5 requests / minute
const batchRateLimiter = RateLimiter.create({
  max: env.RATE_LIMIT_BATCH_MAX,
  windowMs: env.RATE_LIMIT_BATCH_WINDOW_MS,
  keyPrefix: 'batch',
});

// POST /readings - Student submission
router.post(
  '/',
  requireAuth,
  requireRole([UserRole.STUDENT]),
  readingRateLimiter,
  validateRequest({ body: SingleReadingSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ip, userAgent } = AuditLogger.extractReqContext(req);
      const result = await ReadingsService.submitReading({
        userId: req.user!.sub,
        reading: req.body,
        ipAddress: ip,
        userAgent,
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /readings/batch - Student offline sync submission
router.post(
  '/batch',
  requireAuth,
  requireRole([UserRole.STUDENT]),
  batchRateLimiter,
  validateRequest({ body: BatchReadingSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ip, userAgent } = AuditLogger.extractReqContext(req);
      const result = await ReadingsService.submitBatch({
        userId: req.user!.sub,
        readings: req.body.readings,
        ipAddress: ip,
        userAgent,
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /readings/mine - BOLA protected personal history
router.get(
  '/mine',
  requireAuth,
  requireRole([UserRole.STUDENT]),
  validateRequest({ query: ListMineReadingsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = getRepository();
      const page = req.query.page as any;
      const pageSize = req.query.pageSize as any;
      const from = req.query.from ? new Date(req.query.from as string) : undefined;
      const to = req.query.to ? new Date(req.query.to as string) : undefined;
      const zoneId = req.query.zoneId as string | undefined;

      // Strictly binds to authenticated student ID (req.user.sub)
      const { readings, total } = await repo.listReadingsForUser(req.user!.sub, {
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
    } catch (err) {
      next(err);
    }
  }
);

export const readingsRouter = router;
