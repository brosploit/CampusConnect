import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../config/constants';
/**
 * Enforces Role-Based Access Control (RBAC).
 * Prohibits unauthorized users from invoking function-level operations (BFLA defense).
 */
export declare function requireRole(allowedRoles: UserRole[]): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
