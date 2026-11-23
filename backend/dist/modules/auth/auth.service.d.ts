import { UserRole } from '../../config/constants';
export declare class AuthService {
    /**
     * Register a new user account with Argon2id password hashing
     */
    static register(params: {
        email: string;
        password: string;
        displayName?: string;
        role?: UserRole;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<{
        user: {
            id: string;
            email: string;
            displayName: string | null;
            role: UserRole;
            mfaEnabled: boolean;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * Login with email and password, MFA challenge check, and token generation
     */
    static login(params: {
        email: string;
        password: string;
        totpCode?: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<{
        requiresMfaSetup: boolean;
        userId: string;
        email: string;
        role: UserRole;
        requiresMfaChallenge?: undefined;
        user?: undefined;
        accessToken?: undefined;
        refreshToken?: undefined;
    } | {
        requiresMfaChallenge: boolean;
        userId: string;
        email: string;
        requiresMfaSetup?: undefined;
        role?: undefined;
        user?: undefined;
        accessToken?: undefined;
        refreshToken?: undefined;
    } | {
        user: {
            id: string;
            email: string;
            displayName: string | null;
            role: UserRole;
            mfaEnabled: boolean;
        };
        accessToken: string;
        refreshToken: string;
        requiresMfaSetup?: undefined;
        userId?: undefined;
        email?: undefined;
        role?: undefined;
        requiresMfaChallenge?: undefined;
    }>;
    /**
     * Request password reset token (constant-time, prevents user enumeration)
     */
    static requestPasswordReset(params: {
        email: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<{
        message: string;
        devResetToken: string | null | undefined;
    }>;
    /**
     * Confirm password reset with single-use token and revoke all prior sessions
     */
    static confirmPasswordReset(params: {
        token: string;
        newPassword: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<{
        message: string;
    }>;
    /**
     * Set up MFA for user: generates base32 secret and initial code
     */
    static setupMfa(userId: string): Promise<{
        secret: string;
        otpauthUrl: string;
    }>;
    /**
     * Verify and activate MFA
     */
    static verifyAndEnableMfa(userId: string, totpCode: string): Promise<{
        message: string;
    }>;
}
