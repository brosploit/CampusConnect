import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';
import { UserRole } from '../../config/constants';
import { PasswordService } from './password.service';
import { getRepository } from '../../database';
import { RefreshTokenRecord } from '../../database/types';

export interface TokenPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  isVerified: boolean;
  mfaVerified?: boolean;
}

export class TokenService {
  /**
   * Generates short-lived signed JWT access token (15 minutes)
   */
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRATION as any,
      algorithm: 'HS256',
      issuer: 'campus-connect-api',
      audience: 'campus-connect-client',
    });
  }

  /**
   * Verifies access token and returns decoded payload
   */
  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: 'campus-connect-api',
      audience: 'campus-connect-client',
    }) as TokenPayload;
  }

  /**
   * Issues a cryptographically random, single-use refresh token with family tracking.
   * Stores the SHA-256 hash in database; returns the raw token string to the client.
   */
  static async issueRefreshToken(userId: string, existingFamilyId?: string): Promise<string> {
    const repo = getRepository();
    const rawToken = PasswordService.generateSecureToken(32);
    const tokenHash = PasswordService.hashToken(rawToken);
    const familyId = existingFamilyId || uuidv4();
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

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
  static async rotateRefreshToken(
    rawToken: string
  ): Promise<{ accessToken: string; newRefreshToken: string; userId: string; role: UserRole }> {
    const repo = getRepository();
    const tokenHash = PasswordService.hashToken(rawToken);
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
