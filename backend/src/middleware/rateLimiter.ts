import { Request, Response, NextFunction } from 'express';
import { AuditLogger } from './auditLogger';
import { AuditEventType } from '../config/constants';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private static store: Map<string, RateLimitRecord> = new Map();

  /**
   * Factory for creating rate limit middleware with sliding window
   */
  static create(options: { max: number; windowMs: number; keyPrefix?: string }) {
    const { max, windowMs, keyPrefix = 'rl' } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
      // Key can be authenticated user id or verified client IP (honoring trust proxy setting)
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userId = (req as any).user?.sub;
      const key = `${keyPrefix}:${userId || clientIp}`;

      const now = Date.now();
      let record = RateLimiter.store.get(key);

      if (!record || now > record.resetAt) {
        record = { count: 1, resetAt: now + windowMs };
        RateLimiter.store.set(key, record);
      } else {
        record.count++;
      }

      const remaining = Math.max(0, max - record.count);
      const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetSeconds);

      if (record.count > max) {
        res.setHeader('Retry-After', resetSeconds);

        await AuditLogger.log({
          eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
          actorId: userId,
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'] as string,
          resourceType: 'API_ENDPOINT',
          resourceId: req.originalUrl,
          metadata: { limit: max, windowMs, count: record.count },
        });

        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please slow down and try again later.',
            retryAfterSeconds: resetSeconds,
          },
        });
      }

      next();
    };
  }

  /**
   * Resets the rate limiter store (useful for automated testing)
   */
  static resetStore() {
    this.store.clear();
  }
}
