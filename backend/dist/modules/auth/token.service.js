"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const env_1 = require("../../config/env");
const password_service_1 = require("./password.service");
const database_1 = require("../../database");
class TokenService {
    /**
     * Generates short-lived signed JWT access token (15 minutes)
     */
    static generateAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_ACCESS_SECRET, {
            expiresIn: env_1.env.JWT_ACCESS_EXPIRATION,
            algorithm: 'HS256',
            issuer: 'campus-connect-api',
            audience: 'campus-connect-client',
        });
    }
    /**
     * Verifies access token and returns decoded payload
     */
    static verifyAccessToken(token) {
        return jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET, {
            algorithms: ['HS256'],
            issuer: 'campus-connect-api',
            audience: 'campus-connect-client',
        });
    }
    /**
     * Issues a cryptographically random, single-use refresh token with family tracking.
     * Stores the SHA-256 hash in database; returns the raw token string to the client.
     */
    static async issueRefreshToken(userId, existingFamilyId) {
        const repo = (0, database_1.getRepository)();
        const rawToken = password_service_1.PasswordService.generateSecureToken(32);
        const tokenHash = password_service_1.PasswordService.hashToken(rawToken);
        const familyId = existingFamilyId || (0, uuid_1.v4)();
        const expiresAt = new Date(Date.now() + env_1.env.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
        await repo.createRefreshToken({
            user_id: userId,
            token_hash: tokenHash,
            family_id: familyId,
            expires_at: expiresAt,
            revoked_at: null,
        });
        return rawToken;
    }
    /**
     * Validates refresh token, detects token reuse/theft, revokes the family if reused,
     * or rotates the token if valid. Returns new access & refresh tokens.
     */
    static async rotateRefreshToken(rawToken) {
        const repo = (0, database_1.getRepository)();
        const tokenHash = password_service_1.PasswordService.hashToken(rawToken);
        const stored = await repo.getRefreshTokenByHash(tokenHash);
        if (!stored) {
            throw new Error('INVALID_REFRESH_TOKEN');
        }
        // Check if token was already revoked -> REUSE DETECTED (Compromise scenario)
        if (stored.revoked_at !== null) {
            // Invalidate the entire family of tokens!
            await repo.revokeRefreshTokenFamily(stored.family_id);
            throw new Error('REFRESH_TOKEN_REUSE_DETECTED');
        }
        // Check if expired
        if (new Date() > stored.expires_at) {
            await repo.revokeRefreshToken(stored.id);
            throw new Error('REFRESH_TOKEN_EXPIRED');
        }
        // Retrieve user and check suspension
        const user = await repo.getUserById(stored.user_id);
        if (!user || user.is_suspended || user.deleted_at) {
            await repo.revokeRefreshToken(stored.id);
            throw new Error('USER_SUSPENDED_OR_INACTIVE');
        }
        // Check if global user tokens were revoked after this token was created
        if (user.tokens_revoked_at && user.tokens_revoked_at > stored.created_at) {
            await repo.revokeRefreshToken(stored.id);
            throw new Error('SESSION_REVOKED');
        }
        // Revoke old token
        await repo.revokeRefreshToken(stored.id);
        // Issue rotated tokens in the same family
        const newRefreshToken = await this.issueRefreshToken(user.id, stored.family_id);
        const accessToken = this.generateAccessToken({
            sub: user.id,
            email: user.email,
            role: user.role,
            isVerified: user.is_verified,
            mfaVerified: !user.mfa_enabled,
        });
        return {
            accessToken,
            newRefreshToken,
            userId: user.id,
            role: user.role,
        };
    }
}
exports.TokenService = TokenService;
