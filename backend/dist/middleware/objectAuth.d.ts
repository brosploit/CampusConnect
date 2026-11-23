import { Request } from 'express';
/**
 * Object-Level Authorization (BOLA / IDOR Defense)
 * Verifies that the authenticated user is either the resource owner
 * or possesses supervisory role privileges (moderator/administrator).
 */
export declare function checkResourceOwnership(resourceOwnerId: string, req: Request, allowModerator?: boolean): boolean;
