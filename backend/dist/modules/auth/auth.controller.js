"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_service_1 = require("./auth.service");
const token_service_1 = require("./token.service");
const auth_schemas_1 = require("./auth.schemas");
const validate_1 = require("../../middleware/validate");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const auth_1 = require("../../middleware/auth");
const auditLogger_1 = require("../../middleware/auditLogger");
const constants_1 = require("../../config/constants");
const env_1 = require("../../config/env");
const password_service_1 = require("./password.service");
const router = (0, express_1.Router)();
// Rate limit: 5 requests per 15 minutes for sensitive authentication endpoints
const authRateLimiter = rateLimiter_1.RateLimiter.create({
    max: env_1.env.RATE_LIMIT_AUTH_MAX,
    windowMs: env_1.env.RATE_LIMIT_AUTH_WINDOW_MS,
    keyPrefix: 'auth',
});
// Cookie helper
function setAuthCookies(res, accessToken, refreshToken) {
    const isProd = env_1.env.NODE_ENV === 'production';
    res.cookie('cc_access_token', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 mins
    });
    res.cookie('cc_refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'strict',
        path: `${env_1.env.API_PREFIX}/auth`,
        maxAge: env_1.env.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    });
    // Anti-CSRF token cookie (readable by frontend script for header synchronization)
    const csrfToken = password_service_1.PasswordService.generateSecureToken(16);
    res.cookie('cc_csrf_token', csrfToken, {
        httpOnly: false,
        secure: isProd,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
    });
    return csrfToken;
}
function clearAuthCookies(res) {
    const isProd = env_1.env.NODE_ENV === 'production';
    res.clearCookie('cc_access_token', { httpOnly: true, secure: isProd, sameSite: 'strict' });
    res.clearCookie('cc_refresh_token', {
        httpOnly: true,
        secure: isProd,
        sameSite: 'strict',
        path: `${env_1.env.API_PREFIX}/auth`,
    });
    res.clearCookie('cc_csrf_token', { httpOnly: false, secure: isProd, sameSite: 'strict' });
}
// POST /auth/register
router.post('/register', authRateLimiter, (0, validate_1.validateRequest)({ body: auth_schemas_1.RegisterSchema }), async (req, res, next) => {
    try {
        const { ip, userAgent } = auditLogger_1.AuditLogger.extractReqContext(req);
        const result = await auth_service_1.AuthService.register({
            ...req.body,
            ipAddress: ip,
            userAgent,
        });
        const csrfToken = setAuthCookies(res, result.accessToken, result.refreshToken);
        return res.status(201).json({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            csrfToken,
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /auth/login
router.post('/login', authRateLimiter, (0, validate_1.validateRequest)({ body: auth_schemas_1.LoginSchema }), async (req, res, next) => {
    try {
        const { ip, userAgent } = auditLogger_1.AuditLogger.extractReqContext(req);
        const result = await auth_service_1.AuthService.login({
            ...req.body,
            ipAddress: ip,
            userAgent,
        });
        if ('requiresMfaChallenge' in result || 'requiresMfaSetup' in result) {
            return res.status(200).json(result);
        }
        const csrfToken = setAuthCookies(res, result.accessToken, result.refreshToken);
        return res.status(200).json({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            csrfToken,
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /auth/refresh
router.post('/refresh', (0, validate_1.validateRequest)({ body: auth_schemas_1.RefreshTokenSchema }), async (req, res, next) => {
    try {
        const rawToken = req.body.refreshToken || req.cookies?.cc_refresh_token;
        if (!rawToken) {
            return res.status(401).json({
                error: {
                    code: 'MISSING_REFRESH_TOKEN',
                    message: 'Refresh token must be provided via request body or secure cookie.',
                },
            });
        }
        const rotated = await token_service_1.TokenService.rotateRefreshToken(rawToken);
        const csrfToken = setAuthCookies(res, rotated.accessToken, rotated.newRefreshToken);
        await auditLogger_1.AuditLogger.log({
            eventType: constants_1.AuditEventType.AUTH_REFRESH_TOKEN,
            actorId: rotated.userId,
            actorRole: rotated.role,
            ipAddress: req.ip,
        });
        return res.status(200).json({
            accessToken: rotated.accessToken,
            refreshToken: rotated.newRefreshToken,
            csrfToken,
        });
    }
    catch (err) {
        clearAuthCookies(res);
        return res.status(401).json({
            error: {
                code: err.message || 'REFRESH_TOKEN_INVALID',
                message: 'The refresh token could not be validated. Please log in again.',
            },
        });
    }
});
// POST /auth/logout
router.post('/logout', async (req, res, next) => {
    try {
        const rawToken = req.body.refreshToken || req.cookies?.cc_refresh_token;
        if (rawToken) {
            try {
                const repo = (await Promise.resolve().then(() => __importStar(require('../../database')))).getRepository();
                const hash = password_service_1.PasswordService.hashToken(rawToken);
                const stored = await repo.getRefreshTokenByHash(hash);
                if (stored) {
                    await repo.revokeRefreshToken(stored.id);
                }
            }
            catch {
                // Safe silence on logout
            }
        }
        clearAuthCookies(res);
        return res.status(200).json({ message: 'Logged out successfully.' });
    }
    catch (err) {
        next(err);
    }
});
// POST /auth/password-reset/request
router.post('/password-reset/request', authRateLimiter, (0, validate_1.validateRequest)({ body: auth_schemas_1.RequestPasswordResetSchema }), async (req, res, next) => {
    try {
        const { ip, userAgent } = auditLogger_1.AuditLogger.extractReqContext(req);
        const result = await auth_service_1.AuthService.requestPasswordReset({
            email: req.body.email,
            ipAddress: ip,
            userAgent,
        });
        return res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
});
// POST /auth/password-reset/confirm
router.post('/password-reset/confirm', authRateLimiter, (0, validate_1.validateRequest)({ body: auth_schemas_1.ResetPasswordConfirmSchema }), async (req, res, next) => {
    try {
        const { ip, userAgent } = auditLogger_1.AuditLogger.extractReqContext(req);
        const result = await auth_service_1.AuthService.confirmPasswordReset({
            token: req.body.token,
            newPassword: req.body.newPassword,
            ipAddress: ip,
            userAgent,
        });
        return res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
});
// POST /auth/mfa/setup
router.post('/mfa/setup', auth_1.requireAuth, async (req, res, next) => {
    try {
        const result = await auth_service_1.AuthService.setupMfa(req.user.sub);
        return res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
});
// POST /auth/mfa/enable
router.post('/mfa/enable', auth_1.requireAuth, (0, validate_1.validateRequest)({ body: auth_schemas_1.EnableMfaSchema }), async (req, res, next) => {
    try {
        const result = await auth_service_1.AuthService.verifyAndEnableMfa(req.user.sub, req.body.totpCode);
        return res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
});
// GET /auth/me
router.get('/me', auth_1.requireAuth, async (req, res, next) => {
    try {
        const repo = (await Promise.resolve().then(() => __importStar(require('../../database')))).getRepository();
        const user = await repo.getUserById(req.user.sub);
        if (!user) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
        }
        return res.status(200).json({
            user: {
                id: user.id,
                email: user.email,
                displayName: user.display_name,
                role: user.role,
                mfaEnabled: user.mfa_enabled,
                isVerified: user.is_verified,
                createdAt: user.created_at,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.authRouter = router;
