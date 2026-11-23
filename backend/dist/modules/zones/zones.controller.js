"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zonesRouter = exports.campusesRouter = void 0;
const express_1 = require("express");
const database_1 = require("../../database");
const zones_schemas_1 = require("./zones.schemas");
const validate_1 = require("../../middleware/validate");
const router = (0, express_1.Router)();
// GET /campuses
router.get('/', async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
        const campuses = await repo.listCampuses();
        return res.status(200).json({ campuses });
    }
    catch (err) {
        next(err);
    }
});
// GET /campuses/:campusId/zones
router.get('/:campusId/zones', (0, validate_1.validateRequest)({ params: zones_schemas_1.CampusIdParamSchema, query: zones_schemas_1.ListZonesQuerySchema }), async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
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
    }
    catch (err) {
        next(err);
    }
});
// GET /campuses/:campusId/heatmap
router.get('/:campusId/heatmap', (0, validate_1.validateRequest)({ params: zones_schemas_1.CampusIdParamSchema, query: zones_schemas_1.HeatmapQuerySchema }), async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
        const campus = await repo.getCampusById(req.params.campusId);
        if (!campus) {
            return res.status(404).json({ error: { code: 'CAMPUS_NOT_FOUND', message: 'Campus does not exist.' } });
        }
        const metric = req.query.metric || 'download';
        const networkType = req.query.networkType;
        const from = req.query.from ? new Date(req.query.from) : undefined;
        const to = req.query.to ? new Date(req.query.to) : undefined;
        const heatmap = await repo.getCampusHeatmap(campus.id, metric, networkType, from, to);
        return res.status(200).json({
            campusId: campus.id,
            metric,
            unit: metric === 'download' ? 'Mbps' : 'ms',
            zones: heatmap,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.campusesRouter = router;
// Zone-specific router
const zoneSubRouter = (0, express_1.Router)();
// GET /zones/:zoneId
zoneSubRouter.get('/:zoneId', (0, validate_1.validateRequest)({ params: zones_schemas_1.ZoneIdParamSchema }), async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
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
    }
    catch (err) {
        next(err);
    }
});
// GET /zones/:zoneId/analytics
zoneSubRouter.get('/:zoneId/analytics', (0, validate_1.validateRequest)({ params: zones_schemas_1.ZoneIdParamSchema, query: zones_schemas_1.ZoneAnalyticsQuerySchema }), async (req, res, next) => {
    try {
        const repo = (0, database_1.getRepository)();
        const zone = await repo.getZoneById(req.params.zoneId);
        if (!zone) {
            return res.status(404).json({ error: { code: 'ZONE_NOT_FOUND', message: 'Zone does not exist.' } });
        }
        const metric = req.query.metric || 'download';
        const networkType = req.query.networkType;
        const from = req.query.from ? new Date(req.query.from) : undefined;
        const to = req.query.to ? new Date(req.query.to) : undefined;
        const analytics = await repo.getZoneAnalytics(zone.id, metric, networkType, from, to);
        return res.status(200).json({
            zoneId: zone.id,
            zoneName: zone.name,
            metric,
            unit: metric === 'download' ? 'Mbps' : 'ms',
            ...analytics,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.zonesRouter = zoneSubRouter;
