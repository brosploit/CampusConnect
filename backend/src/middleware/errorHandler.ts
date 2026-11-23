import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

/**
 * Request Correlation ID Middleware
 * Assigns or preserves a unique X-Request-ID for every incoming request.
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

/**
 * Central Error-Handling Middleware
 * Never exposes SQL syntax, stack traces, database schema, or internal errors.
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || 'unknown';

  // Internal log with full trace
  console.error('Unhandled API Exception:', {
    requestId,
    method: req.method,
    path: req.path,
    errorName: err.name,
    errorMessage: err.message,
    stack: env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  // Client gets sanitized, standardized error response
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The submitted request payload failed validation criteria.',
        requestId,
        details: err.issues?.map((i: any) => ({
          field: i.path?.join('.'),
          message: i.message,
        })),
      },
    });
  }

  if (err.code === '23505') {
    // PostgreSQL Unique Violation
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'A resource with these details already exists.',
        requestId,
      },
    });
  }

  if (err.message === 'CORS_ORIGIN_DENIED') {
    return res.status(403).json({
      error: {
        code: 'CORS_ERROR',
        message: 'Cross-Origin request not permitted from this origin.',
        requestId,
      },
    });
  }

  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  return res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: statusCode === 500 ? 'An unexpected server error occurred.' : err.message,
      requestId,
    },
  });
}
