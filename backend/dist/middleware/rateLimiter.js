"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
const auditLogger_1 = require("./auditLogger");
const constants_1 = require("../config/constants");
class RateLimiter {
    static store = new Map();
    /**
     * Factory for creating rate limit middleware with sliding window
     */
    static create(options) {
        const { max, windowMs, keyPrefix = 'rl' } = options;
        return async (req, res, next) => {
            // Key can be authenticated user id or client IP
            const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || '127.0.0.1';
            const userId = req.user?.sub;
            const key = `${keyPrefix}:${userId || clientIp}`;
            const now = Date.now();
            let record = RateLimiter.store.get(key);
            if (!record || now > record.resetAt) {
                record = { count: 1, resetAt: now + windowMs };
                RateLimiter.store.set(key, record);
            }
            else {
                record.count++;
            }
            const remaining = Math.max(0, max - record.count);
            const resetSeconds = Math.ceil((record.resetAt - now) / 1000);
            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', remaining);
            res.setHeader('X-RateLimit-Reset', resetSeconds);
            if (record.count > max) {
                res.setHeader('Retry-After', resetSeconds);
                await auditLogger_1.AuditLogger.log({
                    eventType: constants_1.AuditEventType.RATE_LIMIT_EXCEEDED,
                    actorId: userId,
                    ipAddress: clientIp,
                    userAgent: req.headers['user-agent'],
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
exports.RateLimiter = RateLimiter;
