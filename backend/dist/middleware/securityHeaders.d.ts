import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
/**
 * Helmet Security Headers Configuration
 * Enforces strict Content Security Policy (Level 3), HSTS with preloading,
 * Frame-Options DENY, and MIME-sniffing prevention.
 */
export declare const securityHeaders: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
/**
 * CORS configuration with strict explicit origin allowlist
 */
export declare const corsMiddleware: (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
/**
 * Double Submit Anti-CSRF Token Validation for state-changing requests originating from browser sessions
 * Protects cookie-based ambient authority from Cross-Site Request Forgery.
 */
export declare function csrfProtection(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
