import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(4000),
    API_PREFIX: z.string().default('/api/v1'),
    CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),
    COOKIE_SECRET: z.string().min(16).default('development-insecure-cookie-secret-change-in-prod'),
    CSRF_SECRET: z.string().min(16).default('development-insecure-csrf-secret-change-in-prod'),
    JWT_ACCESS_SECRET: z.string().min(16).default('development-insecure-jwt-access-secret-32-bytes'),
    JWT_REFRESH_SECRET: z.string().min(16).default('development-insecure-jwt-refresh-secret-32-bytes'),
    JWT_ACCESS_EXPIRATION: z.string().default('15m'),
    JWT_REFRESH_EXPIRATION_DAYS: z.coerce.number().default(7),
    PASSWORD_RESET_EXPIRATION_MINUTES: z.coerce.number().default(15),
    DATABASE_URL: z.string().default('postgresql://cc_api_user:postgres@localhost:5432/campus_connect'),
    DATABASE_MIGRATION_URL: z.string().optional(),
    USE_MEMORY_DB: z.coerce.boolean().default(false),
    RATE_LIMIT_AUTH_MAX: z.coerce.number().default(5),
    RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
    RATE_LIMIT_READINGS_MAX: z.coerce.number().default(10),
    RATE_LIMIT_READINGS_WINDOW_MS: z.coerce.number().default(60 * 1000),
    RATE_LIMIT_BATCH_MAX: z.coerce.number().default(5),
    RATE_LIMIT_BATCH_WINDOW_MS: z.coerce.number().default(60 * 1000),
    RATE_LIMIT_GENERAL_MAX: z.coerce.number().default(100),
    RATE_LIMIT_GENERAL_WINDOW_MS: z.coerce.number().default(60 * 1000),
    MAX_BATCH_SIZE: z.coerce.number().default(50),
    MIN_SAMPLE_THRESHOLD: z.coerce.number().default(5),
    MIN_DISTINCT_DEVICES: z.coerce.number().default(3),
    MAX_MONITORING_DURATION_MINUTES: z.coerce.number().default(30),
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        const isInsecureAccessSecret =
          data.JWT_ACCESS_SECRET === 'development-insecure-jwt-access-secret-32-bytes' ||
          data.JWT_ACCESS_SECRET.length < 32;
        const isInsecureRefreshSecret =
          data.JWT_REFRESH_SECRET === 'development-insecure-jwt-refresh-secret-32-bytes' ||
          data.JWT_REFRESH_SECRET.length < 32;
        const isInsecureCookieSecret =
          data.COOKIE_SECRET === 'development-insecure-cookie-secret-change-in-prod' ||
          data.COOKIE_SECRET.length < 32;
        const isInsecureCsrfSecret =
          data.CSRF_SECRET === 'development-insecure-csrf-secret-change-in-prod' ||
          data.CSRF_SECRET.length < 32;

        return (
          !isInsecureAccessSecret &&
          !isInsecureRefreshSecret &&
          !isInsecureCookieSecret &&
          !isInsecureCsrfSecret &&
          !data.USE_MEMORY_DB
        );
      }
      return true;
    },
    {
      message:
        'CRITICAL CONFIGURATION ERROR: Production environment detected with default or weak cryptographic secrets. You must supply unique, high-entropy secrets (>= 32 chars) for JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET, and CSRF_SECRET.',
    }
  );

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration validation failed');
}

export const env = parsed.data;

export const corsAllowlist = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
