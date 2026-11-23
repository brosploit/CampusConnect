import { z } from 'zod';
import { env } from '../../config/env';

export const StartMonitoringSchema = z
  .object({
    zoneId: z.string().uuid('Invalid zone ID format'),
    consentVersion: z.string().min(1).max(32).regex(/^[\w\.\-]+$/),
    requestedDurationMinutes: z
      .number()
      .int()
      .min(1)
      .max(env.MAX_MONITORING_DURATION_MINUTES, `Duration cannot exceed ${env.MAX_MONITORING_DURATION_MINUTES} minutes`)
      .default(20),
  })
  .strict();

export const SessionIdParamSchema = z
  .object({
    sessionId: z.string().uuid('Invalid session ID format'),
  })
  .strict();
