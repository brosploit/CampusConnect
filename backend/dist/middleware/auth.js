"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
const token_service_1 = require("../modules/auth/token.service");
const database_1 = require("../database");
/**
 * Enforces cryptographic JWT authentication on protected endpoints.
 * Extracts token from Authorization Bearer header or secure HttpOnly cookie.
 */
async function requireAuth(req, res, next) {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }
    else if (req.cookies && req.cookies.cc_access_token) {
        token = req.cookies.cc_access_token;
    }
    if (!token) {
        return res.status(401).json({
            error: {
                code: 'AUTHENTICATION_REQUIRED',
                message: 'A valid Bearer authentication token is required to access this resource.',
            },
        });
    }
    try {
        const payload = token_service_1.TokenService.verifyAccessToken(token);
        // Verify user exists and is not suspended or soft-deleted
        const repo = (0, database_1.getRepository)();
        const user = await repo.getUserById(payload.sub);
        if (!user || user.is_suspended || user.deleted_at) {
            return res.status(401).json({
                error: {
                    code: 'ACCOUNT_INACTIVE_OR_SUSPENDED',
                    message: 'The account associated with this token is suspended or inactive.',
                },
            });
        }
        req.user = payload;
        next();
    }
    catch (err) {
        return res.status(401).json({
            error: {
                code: 'INVALID_OR_EXPIRED_TOKEN',
                message: 'The authentication token provided is invalid or has expired.',
            },
        });
    }
}
/**
 * Optional authentication middleware: populates req.user if token is present, but does not block.
 */
async function optionalAuth(req, res, next) {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }
    else if (req.cookies && req.cookies.cc_access_token) {
        token = req.cookies.cc_access_token;
    }
    if (token) {
        try {
            req.user = token_service_1.TokenService.verifyAccessToken(token);
        }
        catch {
            // Ignore invalid token in optional auth
        }
    }
    next();
}
