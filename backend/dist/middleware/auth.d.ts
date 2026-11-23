import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '../modules/auth/token.service';
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
export declare function requireAuth(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Optional authentication middleware: populates req.user if token is present, but does not block.
 */
export declare function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
