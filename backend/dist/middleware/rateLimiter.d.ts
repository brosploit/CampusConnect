import { Request, Response, NextFunction } from 'express';
export declare class RateLimiter {
    private static store;
    /**
     * Factory for creating rate limit middleware with sliding window
     */
    static create(options: {
        max: number;
        windowMs: number;
        keyPrefix?: string;
    }): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Resets the rate limiter store (useful for automated testing)
     */
    static resetStore(): void;
}
