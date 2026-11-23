import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
export declare function validateRequest(schemas: {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
