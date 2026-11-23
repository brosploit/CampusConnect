import { z } from 'zod';
import { NetworkType, MeasurementSource } from '../../config/constants';
import { env } from '../../config/env';

// Prohibit collection of persistent hardware identifiers or GPS
const ProhibitedKeys = ['imei', 'imsi', 'sim', 'mac', 'latitude', 'longitude', 'gps', 'phone', 'phonenumber'];

export const NetworkContextSchema = z
  .object({
    serviceState: z.enum(['IN_SERVICE', 'OUT_OF_SERVICE', 'EMERGENCY_ONLY', 'POWER_OFF']).nullable().optional(),
    signalDbm: z.number().int().min(-150).max(0).nullable().optional(),
    radioTechnology: z.string().max(32).regex(/^[\w\s\.\-]+$/).nullable().optional(),
    carrierLabel: z.string().max(64).regex(/^[\w\s\.\-]+$/).nullable().optional(),
    activeTransport: z.string().max(32).regex(/^[\w\-]+$/).nullable().optional(),
    internetCapability: z.boolean().nullable().optional(),
    internetValidated: z.boolean().nullable().optional(),
    dataFreshness: z.enum(['FRESH', 'CACHED', 'UNKNOWN']).nullable().optional(),
  })
  .strict();

export const SingleReadingSchema = z
  .object({
    readingId: z.string().uuid('Invalid reading idempotency ID'),
    zoneId: z.string().uuid('Invalid zone ID'),
    networkType: z.enum([NetworkType.WIFI, NetworkType.MOBILE, NetworkType.OTHER, NetworkType.UNKNOWN]),
    downloadMbps: z.number().min(0).max(10000).nullable().optional(),
    latencyMs: z.number().min(0).max(60000).nullable().optional(),
    measurementSource: z.enum([
      MeasurementSource.APP_TEST,
      MeasurementSource.MANUAL,
      MeasurementSource.IMPORTED,
      MeasurementSource.DEMO,
    ]),
    clientMeasuredAt: z.string().datetime().refine((val) => {
      const measured = new Date(val).getTime();
      const now = Date.now();
      // Allow up to 7 days in the past (offline queue) and 5 minutes in the future (clock skew)
      return measured <= now + 300000 && measured >= now - 7 * 86400000;
    }, { message: 'Measurement timestamp outside permissible offline window (max 7 days past, 5 min future)' }),
    appVersion: z.string().max(32).regex(/^[\w\.\-]+$/).optional(),
    platformVersion: z.string().max(32).regex(/^[\w\.\-\s]+$/).optional(),
    networkContext: NetworkContextSchema.optional(),
  })
  .strict();

export const BatchReadingSchema = z
  .object({
    readings: z
      .array(SingleReadingSchema)
      .min(1, 'Batch must contain at least one reading')
      .max(env.MAX_BATCH_SIZE, `Batch size cannot exceed ${env.MAX_BATCH_SIZE} readings`),
  })
  .strict();

export const ListMineReadingsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    zoneId: z.string().uuid().optional(),
  })
  .strict();
