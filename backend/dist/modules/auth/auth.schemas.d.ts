import { z } from 'zod';
import { UserRole } from '../../config/constants';
export declare const PasswordRule: z.ZodString;
export declare const RegisterSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    role: z.ZodDefault<z.ZodEnum<[UserRole.STUDENT, UserRole.MODERATOR, UserRole.ADMINISTRATOR]>>;
}, "strict", z.ZodTypeAny, {
    email: string;
    role: UserRole;
    password: string;
    displayName?: string | undefined;
}, {
    email: string;
    password: string;
    role?: UserRole | undefined;
    displayName?: string | undefined;
}>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    totpCode: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    email: string;
    password: string;
    totpCode?: string | undefined;
}, {
    email: string;
    password: string;
    totpCode?: string | undefined;
}>;
export declare const RefreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    refreshToken?: string | undefined;
}, {
    refreshToken?: string | undefined;
}>;
export declare const RequestPasswordResetSchema: z.ZodObject<{
    email: z.ZodString;
}, "strict", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const ResetPasswordConfirmSchema: z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
}, "strict", z.ZodTypeAny, {
    token: string;
    newPassword: string;
}, {
    token: string;
    newPassword: string;
}>;
export declare const EnableMfaSchema: z.ZodObject<{
    totpCode: z.ZodString;
}, "strict", z.ZodTypeAny, {
    totpCode: string;
}, {
    totpCode: string;
}>;
export declare const VerifyMfaChallengeSchema: z.ZodObject<{
    totpCode: z.ZodString;
}, "strict", z.ZodTypeAny, {
    totpCode: string;
}, {
    totpCode: string;
}>;
