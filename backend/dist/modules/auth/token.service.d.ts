import { UserRole } from '../../config/constants';
export interface TokenPayload {
    sub: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
    mfaVerified?: boolean;
}
export declare class TokenService {
    /**
     * Generates short-lived signed JWT access token (15 minutes)
     */
    static generateAccessToken(payload: TokenPayload): string;
    /**
     * Verifies access token and returns decoded payload
     */
    static verifyAccessToken(token: string): TokenPayload;
    /**
     * Issues a cryptographically random, single-use refresh token with family tracking.
     * Stores the SHA-256 hash in database; returns the raw token string to the client.
     */
    static issueRefreshToken(userId: string, existingFamilyId?: string): Promise<string>;
    /**
     * Validates refresh token, detects token reuse/theft, revokes the family if reused,
     * or rotates the token if valid. Returns new access & refresh tokens.
     */
    static rotateRefreshToken(rawToken: string): Promise<{
        accessToken: string;
        newRefreshToken: string;
        userId: string;
        role: UserRole;
    }>;
}
