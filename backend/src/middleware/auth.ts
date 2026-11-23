import { Request, Response, NextFunction } from 'express';
import { TokenService, TokenPayload } from '../modules/auth/token.service';
import { getRepository } from '../database';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Enforces cryptographic JWT authentication on protected endpoints.
 * Extracts token from Authorization Bearer header or secure HttpOnly cookie.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.cc_access_token) {
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
    const payload = TokenService.verifyAccessToken(token);

    // Verify user exists and is not suspended or soft-deleted
    const repo = getRepository();
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
  } catch (err: any) {
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
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.cc_access_token) {
    token = req.cookies.cc_access_token;
  }

  if (token) {
    try {
      req.user = TokenService.verifyAccessToken(token);
    } catch {
      // Ignore invalid token in optional auth
    }
  }
  next();
}
