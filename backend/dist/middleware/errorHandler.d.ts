import { Request, Response, NextFunction } from 'express';
/**
 * Request Correlation ID Middleware
 * Assigns or preserves a unique X-Request-ID for every incoming request.
 */
export declare function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Central Error-Handling Middleware
 * Never exposes SQL syntax, stack traces, database schema, or internal errors.
 */
export declare function errorHandler(err: any, req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
