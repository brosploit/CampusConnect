"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyMfaChallengeSchema = exports.EnableMfaSchema = exports.ResetPasswordConfirmSchema = exports.RequestPasswordResetSchema = exports.RefreshTokenSchema = exports.LoginSchema = exports.RegisterSchema = exports.PasswordRule = void 0;
const zod_1 = require("zod");
const constants_1 = require("../../config/constants");
// Strong password policy (NIST SP 800-63B): min 12 chars, upper, lower, digit, special char
exports.PasswordRule = zod_1.z
    .string()
    .min(12, 'Password must be at least 12 characters long')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
exports.RegisterSchema = zod_1.z
    .object({
    email: zod_1.z.string().email().max(255).toLowerCase().trim(),
    password: exports.PasswordRule,
    displayName: zod_1.z.string().min(1).max(100).trim().optional(),
    role: zod_1.z.enum([constants_1.UserRole.STUDENT, constants_1.UserRole.MODERATOR, constants_1.UserRole.ADMINISTRATOR]).default(constants_1.UserRole.STUDENT),
})
    .strict();
exports.LoginSchema = zod_1.z
    .object({
    email: zod_1.z.string().email().max(255).toLowerCase().trim(),
    password: zod_1.z.string().min(1).max(128),
    totpCode: zod_1.z.string().length(6).regex(/^\d{6}$/).optional(),
})
    .strict();
exports.RefreshTokenSchema = zod_1.z
    .object({
    refreshToken: zod_1.z.string().min(32).max(128).optional(), // Optional if sent via HttpOnly cookie
})
    .strict();
exports.RequestPasswordResetSchema = zod_1.z
    .object({
    email: zod_1.z.string().email().max(255).toLowerCase().trim(),
})
    .strict();
exports.ResetPasswordConfirmSchema = zod_1.z
    .object({
    token: zod_1.z.string().min(32).max(128),
    newPassword: exports.PasswordRule,
})
    .strict();
exports.EnableMfaSchema = zod_1.z
    .object({
    totpCode: zod_1.z.string().length(6).regex(/^\d{6}$/),
})
    .strict();
exports.VerifyMfaChallengeSchema = zod_1.z
    .object({
    totpCode: zod_1.z.string().length(6).regex(/^\d{6}$/),
})
    .strict();
