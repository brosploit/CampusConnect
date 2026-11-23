"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsAllowlist = exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const EnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(4000),
    API_PREFIX: zod_1.z.string().default('/api/v1'),
    CORS_ALLOWED_ORIGINS: zod_1.z.string().default('http://localhost:5173,http://localhost:3000'),
    COOKIE_SECRET: zod_1.z.string().min(16).default('development-insecure-cookie-secret-change-in-prod'),
    CSRF_SECRET: zod_1.z.string().min(16).default('development-insecure-csrf-secret-change-in-prod'),
    JWT_ACCESS_SECRET: zod_1.z.string().min(16).default('development-insecure-jwt-access-secret-32-bytes'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(16).default('development-insecure-jwt-refresh-secret-32-bytes'),
    JWT_ACCESS_EXPIRATION: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRATION_DAYS: zod_1.z.coerce.number().default(7),
    PASSWORD_RESET_EXPIRATION_MINUTES: zod_1.z.coerce.number().default(15),
    DATABASE_URL: zod_1.z.string().default('postgresql://cc_api_user:postgres@localhost:5432/campus_connect'),
    DATABASE_MIGRATION_URL: zod_1.z.string().optional(),
    RATE_LIMIT_AUTH_MAX: zod_1.z.coerce.number().default(5),
    RATE_LIMIT_AUTH_WINDOW_MS: zod_1.z.coerce.number().default(15 * 60 * 1000),
    RATE_LIMIT_READINGS_MAX: zod_1.z.coerce.number().default(10),
    RATE_LIMIT_READINGS_WINDOW_MS: zod_1.z.coerce.number().default(60 * 1000),
    RATE_LIMIT_BATCH_MAX: zod_1.z.coerce.number().default(5),
    RATE_LIMIT_BATCH_WINDOW_MS: zod_1.z.coerce.number().default(60 * 1000),
    RATE_LIMIT_GENERAL_MAX: zod_1.z.coerce.number().default(100),
    RATE_LIMIT_GENERAL_WINDOW_MS: zod_1.z.coerce.number().default(60 * 1000),
    MAX_BATCH_SIZE: zod_1.z.coerce.number().default(50),
    MIN_SAMPLE_THRESHOLD: zod_1.z.coerce.number().default(5),
    MIN_DISTINCT_DEVICES: zod_1.z.coerce.number().default(3),
    MAX_MONITORING_DURATION_MINUTES: zod_1.z.coerce.number().default(30),
});
const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.format());
    throw new Error('Environment configuration validation failed');
}
exports.env = parsed.data;
exports.corsAllowlist = exports.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
