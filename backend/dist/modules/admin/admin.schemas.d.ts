import { z } from 'zod';
import { UserRole } from '../../config/constants';
export declare const CreateZoneSchema: z.ZodObject<{
    campusId: z.ZodString;
    buildingId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    mapGeometry: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    name: string;
    campusId: string;
    isActive: boolean;
    description?: string | undefined;
    buildingId?: string | undefined;
    mapGeometry?: Record<string, any> | undefined;
}, {
    name: string;
    campusId: string;
    description?: string | undefined;
    buildingId?: string | undefined;
    mapGeometry?: Record<string, any> | undefined;
    isActive?: boolean | undefined;
}>;
export declare const UpdateZoneSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    mapGeometry: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strict", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    mapGeometry?: Record<string, any> | undefined;
    isActive?: boolean | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    mapGeometry?: Record<string, any> | undefined;
    isActive?: boolean | undefined;
}>;
export declare const SuspendUserSchema: z.ZodObject<{
    isSuspended: z.ZodBoolean;
    reason: z.ZodString;
}, "strict", z.ZodTypeAny, {
    reason: string;
    isSuspended: boolean;
}, {
    reason: string;
    isSuspended: boolean;
}>;
export declare const UpdateUserRoleSchema: z.ZodObject<{
    role: z.ZodEnum<[UserRole.STUDENT, UserRole.MODERATOR, UserRole.ADMINISTRATOR]>;
}, "strict", z.ZodTypeAny, {
    role: UserRole;
}, {
    role: UserRole;
}>;
export declare const UserIdParamSchema: z.ZodObject<{
    userId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
export declare const ListAuditLogsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    page: number;
    pageSize: number;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
