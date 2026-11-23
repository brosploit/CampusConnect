import { z } from 'zod';
import { UserRole } from '../../config/constants';

// Strong password policy (NIST SP 800-63B): min 12 chars, upper, lower, digit, special char
export const PasswordRule = z
  .string()
  .min(12, 'Password must be at least 12 characters long')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const RegisterSchema = z
  .object({
    email: z.string().email().max(255).toLowerCase().trim(),
    password: PasswordRule,
    displayName: z.string().min(1).max(100).trim().optional(),
    role: z.enum([UserRole.STUDENT, UserRole.MODERATOR, UserRole.ADMINISTRATOR]).default(UserRole.STUDENT),
  })
  .strict();

export const LoginSchema = z
  .object({
    email: z.string().email().max(255).toLowerCase().trim(),
    password: z.string().min(1).max(128),
    totpCode: z.string().length(6).regex(/^\d{6}$/).optional(),
  })
  .strict();

export const RefreshTokenSchema = z
  .object({
    refreshToken: z.string().min(32).max(128).optional(), // Optional if sent via HttpOnly cookie
  })
  .strict();

export const RequestPasswordResetSchema = z
  .object({
    email: z.string().email().max(255).toLowerCase().trim(),
  })
  .strict();

export const ResetPasswordConfirmSchema = z
  .object({
    token: z.string().min(32).max(128),
    newPassword: PasswordRule,
  })
  .strict();

export const EnableMfaSchema = z
  .object({
    totpCode: z.string().length(6).regex(/^\d{6}$/),
  })
  .strict();

export const VerifyMfaChallengeSchema = z
  .object({
    totpCode: z.string().length(6).regex(/^\d{6}$/),
  })
  .strict();
