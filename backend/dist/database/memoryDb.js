"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryRepository = void 0;
const uuid_1 = require("uuid");
const constants_1 = require("../config/constants");
const env_1 = require("../config/env");
class MemoryRepository {
    campuses = new Map();
    zones = new Map();
    users = new Map();
    refreshTokens = new Map();
    passwordResets = new Map();
    readings = new Map();
    contexts = new Map();
    monitoringSessions = new Map();
    issueReports = new Map();
    aggregates = new Map();
    auditLogs = [];
    constructor() {
        this.seedDefaults();
    }
    seedDefaults() {
        const campusId = '11111111-1111-1111-1111-111111111111';
        this.campuses.set(campusId, {
            id: campusId,
            name: 'Main University Campus',
            slug: 'main-campus',
            description: 'Official College Campus',
            created_at: new Date(),
        });
        const libraryZoneId = '22222222-2222-2222-2222-222222222222';
        this.zones.set(libraryZoneId, {
            id: libraryZoneId,
            campus_id: campusId,
            building_id: null,
            name: 'Central Library',
            description: 'Main Library Building',
            map_geometry: { type: 'Polygon', coordinates: [] },
            is_active: true,
            created_at: new Date(),
        });
        const labZoneId = '33333333-3333-3333-3333-333333333333';
        this.zones.set(labZoneId, {
            id: labZoneId,
            campus_id: campusId,
            building_id: null,
            name: 'Computer Laboratory',
            description: 'Engineering Block Computer Lab',
            map_geometry: null,
            is_active: true,
            created_at: new Date(),
        });
    }
    async clearAll() {
        this.campuses.clear();
        this.zones.clear();
        this.users.clear();
        this.refreshTokens.clear();
        this.passwordResets.clear();
        this.readings.clear();
        this.contexts.clear();
        this.monitoringSessions.clear();
        this.issueReports.clear();
        this.aggregates.clear();
        this.auditLogs = [];
        this.seedDefaults();
    }
    // Users
    async createUser(user) {
        const existing = await this.getUserByEmail(user.email);
        if (existing) {
            const err = new Error('User already exists');
            err.code = '23505'; // Postgres unique violation code
            throw err;
        }
        const record = {
            id: (0, uuid_1.v4)(),
            ...user,
            tokens_revoked_at: null,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
        };
        this.users.set(record.id, record);
        return { ...record };
    }
    async getUserById(id) {
        const u = this.users.get(id);
        if (!u || u.deleted_at)
            return null;
        return { ...u };
    }
    async getUserByEmail(email) {
        const normalized = email.toLowerCase().trim();
        for (const u of this.users.values()) {
            if (u.email.toLowerCase().trim() === normalized && !u.deleted_at) {
                return { ...u };
            }
        }
        return null;
    }
    async updateUser(id, updates) {
        const user = this.users.get(id);
        if (!user || user.deleted_at)
            return null;
        const updated = { ...user, ...updates, updated_at: new Date() };
        this.users.set(id, updated);
        return { ...updated };
    }
    async listUsers(page, limit) {
        const active = Array.from(this.users.values()).filter((u) => !u.deleted_at);
        const start = (page - 1) * limit;
        const paginated = active.slice(start, start + limit).map((u) => ({ ...u }));
        return { users: paginated, total: active.length };
    }
    // Refresh Tokens
    async createRefreshToken(record) {
        const token = {
            id: (0, uuid_1.v4)(),
            ...record,
            created_at: new Date(),
        };
        this.refreshTokens.set(token.token_hash, token);
        return { ...token };
    }
    async getRefreshTokenByHash(tokenHash) {
        const token = this.refreshTokens.get(tokenHash);
        return token ? { ...token } : null;
    }
    async revokeRefreshToken(id) {
        for (const token of this.refreshTokens.values()) {
            if (token.id === id) {
                token.revoked_at = new Date();
            }
        }
    }
    async revokeRefreshTokenFamily(familyId) {
        for (const token of this.refreshTokens.values()) {
            if (token.family_id === familyId) {
                token.revoked_at = new Date();
            }
        }
    }
    async revokeAllUserRefreshTokens(userId) {
        for (const token of this.refreshTokens.values()) {
            if (token.user_id === userId) {
                token.revoked_at = new Date();
            }
        }
        const user = this.users.get(userId);
        if (user) {
            user.tokens_revoked_at = new Date();
        }
    }
    // Password Resets
    async createPasswordReset(record) {
        const reset = {
            id: (0, uuid_1.v4)(),
            ...record,
            used_at: null,
            created_at: new Date(),
        };
        this.passwordResets.set(reset.token_hash, reset);
        return { ...reset };
    }
    async getPasswordResetByHash(tokenHash) {
        const reset = this.passwordResets.get(tokenHash);
        return reset ? { ...reset } : null;
    }
    async markPasswordResetUsed(id) {
        for (const r of this.passwordResets.values()) {
            if (r.id === id) {
                r.used_at = new Date();
            }
        }
    }
    // Campuses & Zones
    async listCampuses() {
        return Array.from(this.campuses.values());
    }
    async getCampusById(id) {
        return this.campuses.get(id) || null;
    }
    async createCampus(campus) {
        const record = {
            id: (0, uuid_1.v4)(),
            ...campus,
            created_at: new Date(),
        };
        this.campuses.set(record.id, record);
        return { ...record };
    }
    async listZones(campusId, activeOnly = true) {
        return Array.from(this.zones.values()).filter((z) => z.campus_id === campusId && (!activeOnly || z.is_active));
    }
    async getZoneById(id) {
        return this.zones.get(id) || null;
    }
    async createZone(zone) {
        const record = {
            id: (0, uuid_1.v4)(),
            ...zone,
            created_at: new Date(),
        };
        this.zones.set(record.id, record);
        return { ...record };
    }
    async updateZone(id, updates) {
        const z = this.zones.get(id);
        if (!z)
            return null;
        const updated = { ...z, ...updates };
        this.zones.set(id, updated);
        return { ...updated };
    }
    // Readings
    async getReadingById(id) {
        return this.readings.get(id) || null;
    }
    async createReading(reading, context) {
        this.readings.set(reading.reading_id, { ...reading });
        if (context) {
            this.contexts.set(reading.reading_id, {
                reading_id: reading.reading_id,
                ...context,
            });
        }
        return { ...reading };
    }
    async createBatchReadings(items) {
        const accepted = [];
        const duplicates = [];
        const rejected = [];
        for (const item of items) {
            const zone = this.zones.get(item.reading.zone_id);
            if (!zone || !zone.is_active) {
                rejected.push({ readingId: item.reading.reading_id, reason: 'Invalid or inactive campus zone' });
                continue;
            }
            if (this.readings.has(item.reading.reading_id)) {
                duplicates.push(item.reading.reading_id);
                continue;
            }
            this.readings.set(item.reading.reading_id, { ...item.reading });
            if (item.context) {
                this.contexts.set(item.reading.reading_id, {
                    reading_id: item.reading.reading_id,
                    ...item.context,
                });
            }
            accepted.push(item.reading.reading_id);
        }
        return { accepted, duplicates, rejected };
    }
    async listReadingsForUser(userId, params) {
        let list = Array.from(this.readings.values()).filter((r) => r.user_id === userId);
        if (params.zoneId) {
            list = list.filter((r) => r.zone_id === params.zoneId);
        }
        if (params.from) {
            list = list.filter((r) => r.client_measured_at >= params.from);
        }
        if (params.to) {
            list = list.filter((r) => r.client_measured_at <= params.to);
        }
        list.sort((a, b) => b.client_measured_at.getTime() - a.client_measured_at.getTime());
        const start = (params.page - 1) * params.pageSize;
        const paginated = list.slice(start, start + params.pageSize);
        return { readings: paginated, total: list.length };
    }
    // Monitoring Sessions
    async createMonitoringSession(session) {
        const record = {
            id: (0, uuid_1.v4)(),
            ...session,
            ended_at: null,
        };
        this.monitoringSessions.set(record.id, record);
        return { ...record };
    }
    async getMonitoringSessionById(id) {
        return this.monitoringSessions.get(id) || null;
    }
    async getActiveMonitoringSession(userId) {
        const now = new Date();
        for (const session of this.monitoringSessions.values()) {
            if (session.user_id === userId &&
                session.status === constants_1.MonitoringSessionStatus.ACTIVE &&
                session.expires_at > now) {
                return { ...session };
            }
        }
        return null;
    }
    async updateMonitoringSessionStatus(id, status, endedAt = new Date()) {
        const session = this.monitoringSessions.get(id);
        if (!session)
            return null;
        const updated = { ...session, status, ended_at: endedAt };
        this.monitoringSessions.set(id, updated);
        return { ...updated };
    }
    // Issues
    async createIssueReport(issue) {
        const record = {
            id: (0, uuid_1.v4)(),
            ...issue,
            created_at: new Date(),
            reviewed_by: null,
            reviewed_at: null,
            admin_notes: null,
        };
        this.issueReports.set(record.id, record);
        return { ...record };
    }
    async getIssueReportById(id) {
        return this.issueReports.get(id) || null;
    }
    async listIssueReports(params) {
        let list = Array.from(this.issueReports.values());
        if (params.status) {
            list = list.filter((i) => i.status === params.status);
        }
        if (params.zoneId) {
            list = list.filter((i) => i.zone_id === params.zoneId);
        }
        list.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        const start = (params.page - 1) * params.pageSize;
        const paginated = list.slice(start, start + params.pageSize);
        return { issues: paginated, total: list.length };
    }
    async updateIssueReport(id, updates) {
        const report = this.issueReports.get(id);
        if (!report)
            return null;
        const updated = {
            ...report,
            status: updates.status,
            admin_notes: updates.adminNotes !== undefined ? updates.adminNotes : report.admin_notes,
            reviewed_by: updates.reviewedBy !== undefined ? updates.reviewedBy : report.reviewed_by,
            reviewed_at: updates.reviewedAt !== undefined ? updates.reviewedAt : report.reviewed_at,
        };
        this.issueReports.set(id, updated);
        return { ...updated };
    }
    // Analytics & Aggregates
    async getCampusHeatmap(campusId, metric, networkType, from, to) {
        const zones = await this.listZones(campusId, true);
        const results = [];
        for (const zone of zones) {
            const analytics = await this.getZoneAnalytics(zone.id, metric, networkType, from, to);
            results.push({
                zoneId: zone.id,
                zoneName: zone.name,
                ...analytics,
            });
        }
        return results;
    }
    async getZoneAnalytics(zoneId, metric, networkType, from, to) {
        let readings = Array.from(this.readings.values()).filter((r) => r.zone_id === zoneId && r.validation_status === constants_1.ValidationStatus.ACCEPTED);
        if (networkType) {
            readings = readings.filter((r) => r.network_type === networkType);
        }
        if (from) {
            readings = readings.filter((r) => r.client_measured_at >= from);
        }
        if (to) {
            readings = readings.filter((r) => r.client_measured_at <= to);
        }
        const sampleCount = readings.length;
        const uniqueUsers = new Set(readings.map((r) => r.user_id).filter(Boolean));
        const distinctDevices = uniqueUsers.size;
        // Enforce k-anonymity differential privacy threshold
        if (sampleCount < env_1.env.MIN_SAMPLE_THRESHOLD || distinctDevices < env_1.env.MIN_DISTINCT_DEVICES) {
            return {
                sampleCount,
                distinctDevices,
                median: null,
                minimum: null,
                maximum: null,
                status: 'INSUFFICIENT_DATA',
                dataQuality: 'INSUFFICIENT',
                lastUpdatedAt: readings.length ? readings[0].received_at : null,
            };
        }
        const values = [];
        for (const r of readings) {
            if (metric === 'download' && r.download_mbps !== null)
                values.push(Number(r.download_mbps));
            if (metric === 'latency' && r.latency_ms !== null)
                values.push(Number(r.latency_ms));
        }
        if (values.length === 0) {
            return {
                sampleCount,
                distinctDevices,
                median: null,
                minimum: null,
                maximum: null,
                status: 'INSUFFICIENT_DATA',
                dataQuality: 'INSUFFICIENT',
                lastUpdatedAt: null,
            };
        }
        values.sort((a, b) => a - b);
        const min = values[0];
        const max = values[values.length - 1];
        const mid = Math.floor(values.length / 2);
        const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
        let status = 'GOOD';
        if (metric === 'download') {
            if (median < 5)
                status = 'VERY_POOR';
            else if (median < 15)
                status = 'POOR';
            else if (median < 30)
                status = 'UNSTABLE';
        }
        else if (metric === 'latency') {
            if (median > 300)
                status = 'VERY_POOR';
            else if (median > 150)
                status = 'POOR';
            else if (median > 80)
                status = 'UNSTABLE';
        }
        return {
            sampleCount,
            distinctDevices,
            median,
            minimum: min,
            maximum: max,
            status,
            dataQuality: 'SUFFICIENT',
            lastUpdatedAt: readings[readings.length - 1].received_at,
        };
    }
    // Audit Logs
    async createAuditLog(log) {
        const record = {
            id: (0, uuid_1.v4)(),
            ...log,
            created_at: new Date(),
        };
        this.auditLogs.push(record);
        return { ...record };
    }
    async listAuditLogs(page, limit) {
        const list = [...this.auditLogs].reverse();
        const start = (page - 1) * limit;
        const paginated = list.slice(start, start + limit);
        return { logs: paginated, total: list.length };
    }
}
exports.MemoryRepository = MemoryRepository;
