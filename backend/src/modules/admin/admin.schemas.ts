import { z } from 'zod';
import { UserRole } from '../../config/constants';

export const CreateZoneSchema = z
  .object({
    campusId: z.string().uuid('Invalid campus ID format'),
    buildingId: z.string().uuid('Invalid building ID format').optional(),
    name: z.string().min(1).max(100).trim(),
    description: z.string().max(255).trim().optional(),
    mapGeometry: z.record(z.any()).optional(),
    isActive: z.boolean().default(true),
  })
  .strict();

export const UpdateZoneSchema = z
  .object({
    name: z.string().min(1).max(100).trim().optional(),
    description: z.string().max(255).trim().optional(),
    isActive: z.boolean().optional(),
    mapGeometry: z.record(z.any()).optional(),
  })
  .strict();

export const SuspendUserSchema = z
  .object({
    isSuspended: z.boolean(),
    reason: z.string().min(1).max(255).trim(),
  })
  .strict();

export const UpdateUserRoleSchema = z
  .object({
    role: z.enum([UserRole.STUDENT, UserRole.MODERATOR, UserRole.ADMINISTRATOR]),
  })
  .strict();

export const UserIdParamSchema = z
  .object({
    userId: z.string().uuid('Invalid user ID format'),
  })
  .strict();

export const ListAuditLogsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
