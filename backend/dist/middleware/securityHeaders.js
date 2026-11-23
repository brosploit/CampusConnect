"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsMiddleware = exports.securityHeaders = void 0;
exports.csrfProtection = csrfProtection;
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("../config/env");
/**
 * Helmet Security Headers Configuration
 * Enforces strict Content Security Policy (Level 3), HSTS with preloading,
 * Frame-Options DENY, and MIME-sniffing prevention.
 */
exports.securityHeaders = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'none'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org'],
            connectSrc: ["'self'", ...env_1.corsAllowlist],
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
exports.corsMiddleware = (0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow non-browser requests (e.g., mobile apps, curl in dev) or explicit allowlisted origins
        if (!origin || env_1.corsAllowlist.includes(origin)) {
            callback(null, true);
        }
        else {
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
function csrfProtection(req, res, next) {
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
