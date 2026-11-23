import { z } from 'zod';
import { NetworkType } from '../../config/constants';

export const ListZonesQuerySchema = z
  .object({
    active: z.enum(['true', 'false']).optional(),
  })
  .strict();

export const ZoneIdParamSchema = z
  .object({
    zoneId: z.string().uuid('Invalid zone ID format'),
  })
  .strict();

export const CampusIdParamSchema = z
  .object({
    campusId: z.string().uuid('Invalid campus ID format'),
  })
  .strict();

export const HeatmapQuerySchema = z
  .object({
    metric: z.enum(['download', 'latency', 'reliability']).default('download'),
    networkType: z.enum(['WIFI', 'MOBILE', 'OTHER', 'UNKNOWN']).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    bucket: z.enum(['hour', 'day', 'week']).default('day'),
  })
  .strict();

export const ZoneAnalyticsQuerySchema = z
  .object({
    metric: z.enum(['download', 'latency', 'reliability']).default('download'),
    networkType: z.enum(['WIFI', 'MOBILE', 'OTHER', 'UNKNOWN']).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .strict();
