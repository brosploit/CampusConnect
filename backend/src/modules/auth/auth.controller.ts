import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  RequestPasswordResetSchema,
  ResetPasswordConfirmSchema,
  EnableMfaSchema,
} from './auth.schemas';
import { validateRequest } from '../../middleware/validate';
import { RateLimiter } from '../../middleware/rateLimiter';
import { requireAuth } from '../../middleware/auth';
import { AuditLogger } from '../../middleware/auditLogger';
import { AuditEventType } from '../../config/constants';
import { env } from '../../config/env';
import { PasswordService } from './password.service';

const router = Router();

// Rate limit: 5 requests per 15 minutes for sensitive authentication endpoints
const authRateLimiter = RateLimiter.create({
  max: env.RATE_LIMIT_AUTH_MAX,
  windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
  keyPrefix: 'auth',
});

// Cookie helper
function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProd = env.NODE_ENV === 'production';

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
    path: `${env.API_PREFIX}/auth`,
    maxAge: env.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
  });

  // Anti-CSRF token cookie (readable by frontend script for header synchronization)
  const csrfToken = PasswordService.generateSecureToken(16);
  res.cookie('cc_csrf_token', csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  });

  return csrfToken;
}

function clearAuthCookies(res: Response) {
  const isProd = env.NODE_ENV === 'production';
  res.clearCookie('cc_access_token', { httpOnly: true, secure: isProd, sameSite: 'strict' });
  res.clearCookie('cc_refresh_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: `${env.API_PREFIX}/auth`,
  });
  res.clearCookie('cc_csrf_token', { httpOnly: false, secure: isProd, sameSite: 'strict' });
}

// POST /auth/register
router.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: RegisterSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ip, userAgent } = AuditLogger.extractReqContext(req);
      const result = await AuthService.register({
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
    } catch (err) {
      next(err);
    }
  }
);

// POST /auth/login
router.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: LoginSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ip, userAgent } = AuditLogger.extractReqContext(req);
      const result = await AuthService.login({
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
    } catch (err) {
      next(err);
    }
  }
);

// POST /auth/refresh
router.post(
  '/refresh',
  validateRequest({ body: RefreshTokenSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
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

      const rotated = await TokenService.rotateRefreshToken(rawToken);
      const csrfToken = setAuthCookies(res, rotated.accessToken, rotated.newRefreshToken);

      await AuditLogger.log({
        eventType: AuditEventType.AUTH_REFRESH_TOKEN,
        actorId: rotated.userId,
        actorRole: rotated.role,
        ipAddress: req.ip,
      });

      return res.status(200).json({
        accessToken: rotated.accessToken,
        refreshToken: rotated.newRefreshToken,
        csrfToken,
      });
    } catch (err: any) {
      clearAuthCookies(res);
      return res.status(401).json({
        error: {
          code: err.message || 'REFRESH_TOKEN_INVALID',
          message: 'The refresh token could not be validated. Please log in again.',
        },
      });
    }
  }
);

// POST /auth/logout
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawToken = req.body.refreshToken || req.cookies?.cc_refresh_token;
    if (rawToken) {
      try {
        const repo = (await import('../../database')).getRepository();
        const hash = PasswordService.hashToken(rawToken);
        const stored = await repo.getRefreshTokenByHash(hash);
        if (stored) {
          await repo.revokeRefreshToken(stored.id);
        }
      } catch {
        // Safe silence on logout
      }
    }

    clearAuthCookies(res);
    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
});

// POST /auth/password-reset/request
router.post(
  '/password-reset/request',
  authRateLimiter,
  validateRequest({ body: RequestPasswordResetSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ip, userAgent } = AuditLogger.extractReqContext(req);
      const result = await AuthService.requestPasswordReset({
        email: req.body.email,
        ipAddress: ip,
        userAgent,
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /auth/password-reset/confirm
router.post(
  '/password-reset/confirm',
  authRateLimiter,
  validateRequest({ body: ResetPasswordConfirmSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ip, userAgent } = AuditLogger.extractReqContext(req);
      const result = await AuthService.confirmPasswordReset({
        token: req.body.token,
        newPassword: req.body.newPassword,
        ipAddress: ip,
        userAgent,
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /auth/mfa/setup
router.post('/mfa/setup', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.setupMfa(req.user!.sub);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /auth/mfa/enable
router.post(
  '/mfa/enable',
  requireAuth,
  validateRequest({ body: EnableMfaSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await AuthService.verifyAndEnableMfa(req.user!.sub, req.body.totpCode);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /auth/me
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = (await import('../../database')).getRepository();
    const user = await repo.getUserById(req.user!.sub);
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
  } catch (err) {
    next(err);
  }
});

export const authRouter = router;
