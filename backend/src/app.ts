import express from 'express';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { correlationIdMiddleware, errorHandler } from './middleware/errorHandler';
import { securityHeaders, corsMiddleware, csrfProtection } from './middleware/securityHeaders';
import { RateLimiter } from './middleware/rateLimiter';
import { authRouter } from './modules/auth/auth.controller';
import { campusesRouter, zonesRouter } from './modules/zones/zones.controller';
import { readingsRouter } from './modules/readings/readings.controller';
import { monitoringRouter } from './modules/monitoring/monitoring.controller';
import { issuesRouter, adminIssuesRouter } from './modules/issues/issues.controller';
import { adminRouter } from './modules/admin/admin.controller';

export function createApp() {
  const app = express();

  // 1. Trust Proxy Configuration (for correct client IP extraction behind reverse proxy)
  app.set('trust proxy', 1);

  // 2. Correlation ID & Security Headers
  app.use(correlationIdMiddleware);
  app.use(securityHeaders);
  app.use(corsMiddleware);

  // 3. Body parsers with strict size limits
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  // 4. Global Anti-CSRF protection for cookie-authenticated browser sessions
  app.use(csrfProtection);

  // 5. General rate limiting for all endpoints
  const generalLimiter = RateLimiter.create({
    max: env.RATE_LIMIT_GENERAL_MAX,
    windowMs: env.RATE_LIMIT_GENERAL_WINDOW_MS,
    keyPrefix: 'gen',
  });
  app.use(generalLimiter);

  // 6. Public Health Check (no internal server/DB schema details exposed)
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'campus-connect-api',
      timestamp: new Date().toISOString(),
    });
  });

  // 7. API Version 1 Routes
  const v1 = express.Router();
  v1.use('/auth', authRouter);
  v1.use('/campuses', campusesRouter);
  v1.use('/zones', zonesRouter);
  v1.use('/readings', readingsRouter);
  v1.use('/monitoring', monitoringRouter);
  v1.use('/issues', issuesRouter);
  v1.use('/admin', adminIssuesRouter);
  v1.use('/admin', adminRouter);

  app.use(env.API_PREFIX, v1);

  // 8. 404 Handler for undefined routes
  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested API route does not exist.',
        requestId: req.headers['x-request-id'],
      },
    });
  });

  // 9. Central Error Handling Middleware
  app.use(errorHandler);

  return app;
}
