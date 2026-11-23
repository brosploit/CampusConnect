import { getRepository } from '../../database';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { MfaService } from './mfa.service';
import { UserRole, AuditEventType } from '../../config/constants';
import { AuditLogger } from '../../middleware/auditLogger';
import { env } from '../../config/env';

export class AuthService {
  /**
   * Register a new user account with Argon2id password hashing
   */
  static async register(params: {
    email: string;
    password: string;
    displayName?: string;
    role?: UserRole;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const repo = getRepository();
    const normalizedEmail = params.email.toLowerCase().trim();

    // Check if user already exists (anti-enumeration: constant-time flow)
    const existing = await repo.getUserByEmail(normalizedEmail);
    if (existing) {
      // Artificial delay to mimic hashing duration
      await PasswordService.hashPassword(params.password);
      const err: any = new Error('Registration failed. Please check your details.');
      err.statusCode = 400;
      throw err;
    }

    const passwordHash = await PasswordService.hashPassword(params.password);
    const role = params.role || UserRole.STUDENT;

    const user = await repo.createUser({
      email: normalizedEmail,
      password_hash: passwordHash,
      display_name: params.displayName || null,
      role,
      is_verified: true, // Auto-verified for local dev / campus registration flow
      is_suspended: false,
      mfa_enabled: false,
      mfa_secret: null,
      tokens_revoked_at: null,
    });

    await AuditLogger.log({
      eventType: AuditEventType.AUTH_REGISTER,
      actorId: user.id,
      actorRole: user.role,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      resourceType: 'USER',
      resourceId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    const accessToken = TokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified,
      mfaVerified: true,
    });
    const refreshToken = await TokenService.issueRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        mfaEnabled: user.mfa_enabled,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login with email and password, MFA challenge check, and token generation
   */
  static async login(params: {
    email: string;
    password: string;
    totpCode?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const repo = getRepository();
    const normalizedEmail = params.email.toLowerCase().trim();
    const user = await repo.getUserByEmail(normalizedEmail);

    // Constant-time mitigation against timing attacks & enumeration
    const dummyHash = '$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHQ$Ww9t1Z9xK6aT2e7mU5v8';
    const hashToVerify = user ? user.password_hash : dummyHash;
    const isPasswordValid = await PasswordService.verifyPassword(hashToVerify, params.password);

    if (!user || !isPasswordValid) {
      await AuditLogger.log({
        eventType: AuditEventType.AUTH_LOGIN_FAILURE,
        actorId: user?.id || null,
        actorRole: user?.role || null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        resourceType: 'AUTH',
        resourceId: normalizedEmail,
        metadata: { reason: 'INVALID_CREDENTIALS' },
      });

      const err: any = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    if (user.is_suspended) {
      await AuditLogger.log({
        eventType: AuditEventType.AUTH_LOGIN_FAILURE,
        actorId: user.id,
        actorRole: user.role,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        resourceType: 'AUTH',
        resourceId: user.id,
        metadata: { reason: 'ACCOUNT_SUSPENDED' },
      });

      const err: any = new Error('Your account is currently suspended. Please contact campus administration.');
      err.statusCode = 403;
      err.code = 'ACCOUNT_SUSPENDED';
      throw err;
    }

    // Check MFA if enabled or if user is Administrator (mandatory for admins)
    const requiresMfa = user.mfa_enabled || user.role === UserRole.ADMINISTRATOR;
    if (requiresMfa) {
      if (!user.mfa_secret) {
        // Administrator without configured MFA must set it up
        return {
          requiresMfaSetup: true,
          userId: user.id,
          email: user.email,
          role: user.role,
        };
      }

      if (!params.totpCode) {
        return {
          requiresMfaChallenge: true,
          userId: user.id,
          email: user.email,
        };
      }

      const rawSecret = MfaService.decryptSecret(user.mfa_secret);
      const isMfaValid = MfaService.verifyTOTP(rawSecret, params.totpCode);
      if (!isMfaValid) {
        await AuditLogger.log({
          eventType: AuditEventType.AUTH_MFA_CHALLENGE_FAILED,
          actorId: user.id,
          actorRole: user.role,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          resourceType: 'MFA',
          resourceId: user.id,
        });

        const err: any = new Error('Invalid Multi-Factor Authentication code.');
        err.statusCode = 401;
        throw err;
      }
    }

    await AuditLogger.log({
      eventType: AuditEventType.AUTH_LOGIN_SUCCESS,
      actorId: user.id,
      actorRole: user.role,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      resourceType: 'USER',
      resourceId: user.id,
    });

    const accessToken = TokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified,
      mfaVerified: true,
    });
    const refreshToken = await TokenService.issueRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        mfaEnabled: user.mfa_enabled,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Request password reset token (constant-time, prevents user enumeration)
   */
  static async requestPasswordReset(params: { email: string; ipAddress?: string; userAgent?: string }) {
    const repo = getRepository();
    const normalizedEmail = params.email.toLowerCase().trim();
    const user = await repo.getUserByEmail(normalizedEmail);

    let rawToken: string | null = null;
    if (user && !user.is_suspended && !user.deleted_at) {
      rawToken = PasswordService.generateSecureToken(32);
      const tokenHash = PasswordService.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_EXPIRATION_MINUTES * 60 * 1000);

      await repo.createPasswordReset({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

      await AuditLogger.log({
        eventType: AuditEventType.AUTH_PASSWORD_RESET_REQUEST,
        actorId: user.id,
        actorRole: user.role,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        resourceType: 'USER',
        resourceId: user.id,
      });
    }

    // Always return generic success message to prevent account enumeration
    return {
      message: 'If the provided email is registered in our system, a password reset link has been dispatched.',
      // In development / test mode, we expose the token so automated tests can verify the flow
      devResetToken: env.NODE_ENV !== 'production' ? rawToken : undefined,
    };
  }

  /**
   * Confirm password reset with single-use token and revoke all prior sessions
   */
  static async confirmPasswordReset(params: {
    token: string;
    newPassword: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const repo = getRepository();
    const tokenHash = PasswordService.hashToken(params.token);
    const resetRecord = await repo.getPasswordResetByHash(tokenHash);

    if (!resetRecord || resetRecord.used_at !== null || new Date() > resetRecord.expires_at) {
      const err: any = new Error('The password reset token is invalid, used, or expired.');
      err.statusCode = 400;
      throw err;
    }

    const user = await repo.getUserById(resetRecord.user_id);
    if (!user || user.is_suspended || user.deleted_at) {
      const err: any = new Error('User account is invalid or inactive.');
      err.statusCode = 400;
      throw err;
    }

    // Mark reset token used immediately
    await repo.markPasswordResetUsed(resetRecord.id);

    // Update password and invalidate all active sessions
    const newPasswordHash = await PasswordService.hashPassword(params.newPassword);
    await repo.updateUser(user.id, {
      password_hash: newPasswordHash,
      tokens_revoked_at: new Date(),
    });
    await repo.revokeAllUserRefreshTokens(user.id);

    await AuditLogger.log({
      eventType: AuditEventType.AUTH_PASSWORD_RESET_SUCCESS,
      actorId: user.id,
      actorRole: user.role,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      resourceType: 'USER',
      resourceId: user.id,
    });

    return {
      message: 'Password successfully updated. All active sessions have been revoked. Please log in with your new credentials.',
    };
  }

  /**
   * Set up MFA for user: generates base32 secret and initial code
   */
  static async setupMfa(userId: string) {
    const repo = getRepository();
    const user = await repo.getUserById(userId);
    if (!user) {
      const err: any = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    const secret = MfaService.generateSecret();
    await repo.updateUser(userId, { mfa_secret: MfaService.encryptSecret(secret) });

    return {
      secret,
      otpauthUrl: `otpauth://totp/CampusConnect:${user.email}?secret=${secret}&issuer=CampusConnect`,
    };
  }

  /**
   * Verify and activate MFA
   */
  static async verifyAndEnableMfa(userId: string, totpCode: string) {
    const repo = getRepository();
    const user = await repo.getUserById(userId);
    if (!user || !user.mfa_secret) {
      const err: any = new Error('MFA has not been initiated for this account.');
      err.statusCode = 400;
      throw err;
    }

    const rawSecret = MfaService.decryptSecret(user.mfa_secret);
    const isValid = MfaService.verifyTOTP(rawSecret, totpCode);
    if (!isValid) {
      const err: any = new Error('Invalid TOTP verification code.');
      err.statusCode = 400;
      throw err;
    }

    await repo.updateUser(userId, { mfa_enabled: true });
    await AuditLogger.log({
      eventType: AuditEventType.AUTH_MFA_ENABLED,
      actorId: user.id,
      actorRole: user.role,
      resourceType: 'USER',
      resourceId: user.id,
    });

    return { message: 'Multi-Factor Authentication enabled successfully.' };
  }
}
