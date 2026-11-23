import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { corsAllowlist, env } from '../config/env';

/**
 * Helmet Security Headers Configuration
 * Enforces strict Content Security Policy (Level 3), HSTS with preloading,
 * Frame-Options DENY, and MIME-sniffing prevention.
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org'],
      connectSrc: ["'self'", ...corsAllowlist],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

/**
 * CORS configuration with strict explicit origin allowlist
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g., mobile apps, curl in dev) or explicit allowlisted origins
    if (!origin || corsAllowlist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS_ORIGIN_DENIED'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-CSRF-Token', 'Accept'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
  maxAge: 86400, // 24 hours
});

/**
 * Double Submit Anti-CSRF Token Validation for state-changing requests originating from browser sessions
 * Protects cookie-based ambient authority from Cross-Site Request Forgery.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Safe idempotent methods do not require CSRF token
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // If request utilizes Bearer token in Authorization header, CSRF does not apply (API/mobile client)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // If request does NOT have session cookies, it is an unauthenticated or non-cookie request
  const hasSessionCookie = Boolean(req.cookies?.cc_access_token || req.cookies?.cc_refresh_token);
  if (!hasSessionCookie) {
    return next();
  }

  // If request uses cookie session, require matching CSRF header
  const csrfCookie = req.cookies?.['cc_csrf_token'];
  const csrfHeader = req.headers['x-csrf-token'];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({
      error: {
        code: 'CSRF_VALIDATION_FAILED',
        message: 'Invalid or missing CSRF token for browser session.',
      },
    });
  }

  next();
}
