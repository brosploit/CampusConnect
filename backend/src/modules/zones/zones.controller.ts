import { Router, Request, Response, NextFunction } from 'express';
import { getRepository } from '../../database';
import {
  ListZonesQuerySchema,
  CampusIdParamSchema,
  ZoneIdParamSchema,
  HeatmapQuerySchema,
  ZoneAnalyticsQuerySchema,
} from './zones.schemas';
import { validateRequest } from '../../middleware/validate';

const router = Router();

// GET /campuses
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = getRepository();
    const campuses = await repo.listCampuses();
    return res.status(200).json({ campuses });
  } catch (err) {
    next(err);
  }
});

// GET /campuses/:campusId/zones
router.get(
  '/:campusId/zones',
  validateRequest({ params: CampusIdParamSchema, query: ListZonesQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = getRepository();
      const campus = await repo.getCampusById(req.params.campusId);
      if (!campus) {
        return res.status(404).json({ error: { code: 'CAMPUS_NOT_FOUND', message: 'Campus does not exist.' } });
      }

      const activeOnly = req.query.active !== 'false';
      const zones = await repo.listZones(req.params.campusId, activeOnly);
      return res.status(200).json({
        campusId: campus.id,
        campusName: campus.name,
        zones: zones.map((z) => ({
          id: z.id,
          name: z.name,
          buildingId: z.building_id,
          description: z.description,
          isActive: z.is_active,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /campuses/:campusId/heatmap
router.get(
  '/:campusId/heatmap',
  validateRequest({ params: CampusIdParamSchema, query: HeatmapQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = getRepository();
      const campus = await repo.getCampusById(req.params.campusId);
      if (!campus) {
        return res.status(404).json({ error: { code: 'CAMPUS_NOT_FOUND', message: 'Campus does not exist.' } });
      }

      const metric = (req.query.metric as string) || 'download';
      const networkType = req.query.networkType as string | undefined;
      const from = req.query.from ? new Date(req.query.from as string) : undefined;
      const to = req.query.to ? new Date(req.query.to as string) : undefined;

      const heatmap = await repo.getCampusHeatmap(campus.id, metric, networkType, from, to);

      return res.status(200).json({
        campusId: campus.id,
        metric,
        unit: metric === 'download' ? 'Mbps' : 'ms',
        zones: heatmap,
      });
    } catch (err) {
      next(err);
    }
  }
);

export const campusesRouter = router;

// Zone-specific router
const zoneSubRouter = Router();

// GET /zones/aggregates - Public aggregated zone metrics with k-anonymity guard
zoneSubRouter.get('/aggregates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = getRepository();
    const campuses = await repo.listCampuses();
    const allAggregates: any[] = [];

    for (const campus of campuses) {
      const zones = await repo.listZones(campus.id, true);
      for (const zone of zones) {
        const analytics = await repo.getZoneAnalytics(zone.id, 'download');
        allAggregates.push({
          zoneId: zone.id,
          zoneName: zone.name,
          building: zone.description || 'Campus Facility',
          zoneType: 'INDOOR',
          status: analytics.status,
          sampleCount: analytics.sampleCount,
          avgLatencyMs: analytics.avgLatencyMs ?? null,
          avgDownloadMbps: analytics.medianValue ?? null,
          avgSignalDbm: null,
          confidence: analytics.sampleCount >= 10 ? 'HIGH' : analytics.sampleCount >= 5 ? 'MEDIUM' : 'NONE',
          dataFreshness: 'Live',
          lastObservedAt: new Date().toISOString(),
          hasSufficientData: analytics.status !== 'INSUFFICIENT_DATA',
          neutralDiagnosticFinding:
            analytics.status === 'INSUFFICIENT_DATA'
              ? 'Awaiting minimum sample threshold (5 samples required).'
              : `Aggregated network performance rated as ${analytics.status}.`,
        });
      }
    }

    return res.status(200).json({ aggregates: allAggregates });
  } catch (err) {
    next(err);
  }
});

// GET /zones/:zoneId
zoneSubRouter.get(
  '/:zoneId',
  validateRequest({ params: ZoneIdParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = getRepository();
      const zone = await repo.getZoneById(req.params.zoneId);
      if (!zone) {
        return res.status(404).json({ error: { code: 'ZONE_NOT_FOUND', message: 'Zone does not exist.' } });
      }

      return res.status(200).json({
        id: zone.id,
        campusId: zone.campus_id,
        buildingId: zone.building_id,
        name: zone.name,
        description: zone.description,
        isActive: zone.is_active,
        mapGeometry: zone.map_geometry,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /zones/:zoneId/analytics
zoneSubRouter.get(
  '/:zoneId/analytics',
  validateRequest({ params: ZoneIdParamSchema, query: ZoneAnalyticsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = getRepository();
      const zone = await repo.getZoneById(req.params.zoneId);
      if (!zone) {
        return res.status(404).json({ error: { code: 'ZONE_NOT_FOUND', message: 'Zone does not exist.' } });
      }

      const metric = (req.query.metric as string) || 'download';
      const networkType = req.query.networkType as string | undefined;
      const from = req.query.from ? new Date(req.query.from as string) : undefined;
      const to = req.query.to ? new Date(req.query.to as string) : undefined;

      const analytics = await repo.getZoneAnalytics(zone.id, metric, networkType, from, to);

      return res.status(200).json({
        zoneId: zone.id,
        zoneName: zone.name,
        metric,
        unit: metric === 'download' ? 'Mbps' : 'ms',
        ...analytics,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /zones/:zoneId/aggregate - Aggregated zone metrics for detail view
zoneSubRouter.get(
  '/:zoneId/aggregate',
  validateRequest({ params: ZoneIdParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = getRepository();
      const zone = await repo.getZoneById(req.params.zoneId);
      if (!zone) {
        return res.status(404).json({ error: { code: 'ZONE_NOT_FOUND', message: 'Zone does not exist.' } });
      }

      const analytics = await repo.getZoneAnalytics(zone.id, 'download');
      return res.status(200).json({
        aggregate: {
          zoneId: zone.id,
          zoneName: zone.name,
          building: zone.description || 'Campus Facility',
          zoneType: 'INDOOR',
          status: analytics.status,
          sampleCount: analytics.sampleCount,
          avgLatencyMs: analytics.avgLatencyMs ?? null,
          avgDownloadMbps: analytics.medianValue ?? null,
          avgSignalDbm: null,
          confidence: analytics.sampleCount >= 10 ? 'HIGH' : analytics.sampleCount >= 5 ? 'MEDIUM' : 'NONE',
          dataFreshness: 'Live',
          lastObservedAt: new Date().toISOString(),
          hasSufficientData: analytics.status !== 'INSUFFICIENT_DATA',
          neutralDiagnosticFinding:
            analytics.status === 'INSUFFICIENT_DATA'
              ? 'Awaiting minimum sample threshold (5 samples required).'
              : `Aggregated network performance rated as ${analytics.status}.`,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export const zonesRouter = zoneSubRouter;
