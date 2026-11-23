import { v4 as uuidv4 } from 'uuid';
import { IRepository } from './repository';
import {
  CampusRecord,
  ZoneRecord,
  UserRecord,
  RefreshTokenRecord,
  PasswordResetRecord,
  ReadingRecord,
  ReadingNetworkContextRecord,
  MonitoringSessionRecord,
  IssueReportRecord,
  ZoneAggregateRecord,
  AuditLogRecord,
} from './types';
import { MonitoringSessionStatus, ValidationStatus, UserRole } from '../config/constants';
import { env } from '../config/env';

export class MemoryRepository implements IRepository {
  public campuses: Map<string, CampusRecord> = new Map();
  public zones: Map<string, ZoneRecord> = new Map();
  public users: Map<string, UserRecord> = new Map();
  public refreshTokens: Map<string, RefreshTokenRecord> = new Map();
  public passwordResets: Map<string, PasswordResetRecord> = new Map();
  public readings: Map<string, ReadingRecord> = new Map();
  public contexts: Map<string, ReadingNetworkContextRecord> = new Map();
  public monitoringSessions: Map<string, MonitoringSessionRecord> = new Map();
  public issueReports: Map<string, IssueReportRecord> = new Map();
  public aggregates: Map<string, ZoneAggregateRecord> = new Map();
  public auditLogs: AuditLogRecord[] = [];

  constructor() {
    this.seedDefaults();
  }

  public seedDefaults() {
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

  async clearAll(): Promise<void> {
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
  async createUser(user: Omit<UserRecord, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<UserRecord> {
    const existing = await this.getUserByEmail(user.email);
    if (existing) {
      const err: any = new Error('User already exists');
      err.code = '23505'; // Postgres unique violation code
      throw err;
    }
    const record: UserRecord = {
      id: uuidv4(),
      ...user,
      tokens_revoked_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };
    this.users.set(record.id, record);
    return { ...record };
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    const u = this.users.get(id);
    if (!u || u.deleted_at) return null;
    return { ...u };
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase().trim() === normalized && !u.deleted_at) {
        return { ...u };
      }
    }
    return null;
  }

  async updateUser(id: string, updates: Partial<UserRecord>): Promise<UserRecord | null> {
    const user = this.users.get(id);
    if (!user || user.deleted_at) return null;
    const updated = { ...user, ...updates, updated_at: new Date() };
    this.users.set(id, updated);
    return { ...updated };
  }

  async listUsers(page: number, limit: number): Promise<{ users: UserRecord[]; total: number }> {
    const active = Array.from(this.users.values()).filter((u) => !u.deleted_at);
    const start = (page - 1) * limit;
    const paginated = active.slice(start, start + limit).map((u) => ({ ...u }));
    return { users: paginated, total: active.length };
  }

  // Refresh Tokens
  async createRefreshToken(record: Omit<RefreshTokenRecord, 'id' | 'created_at'>): Promise<RefreshTokenRecord> {
    const token: RefreshTokenRecord = {
      id: uuidv4(),
      ...record,
      created_at: new Date(),
    };
    this.refreshTokens.set(token.token_hash, token);
    return { ...token };
  }

  async getRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const token = this.refreshTokens.get(tokenHash);
    return token ? { ...token } : null;
  }

  async revokeRefreshToken(id: string): Promise<void> {
    for (const token of this.refreshTokens.values()) {
      if (token.id === id) {
        token.revoked_at = new Date();
      }
    }
  }

  async revokeRefreshTokenFamily(familyId: string): Promise<void> {
    for (const token of this.refreshTokens.values()) {
      if (token.family_id === familyId) {
        token.revoked_at = new Date();
      }
    }
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
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
  async createPasswordReset(
    record: Omit<PasswordResetRecord, 'id' | 'created_at' | 'used_at'>
  ): Promise<PasswordResetRecord> {
    const reset: PasswordResetRecord = {
      id: uuidv4(),
      ...record,
      used_at: null,
      created_at: new Date(),
    };
    this.passwordResets.set(reset.token_hash, reset);
    return { ...reset };
  }

  async getPasswordResetByHash(tokenHash: string): Promise<PasswordResetRecord | null> {
    const reset = this.passwordResets.get(tokenHash);
    return reset ? { ...reset } : null;
  }

  async markPasswordResetUsed(id: string): Promise<void> {
    for (const r of this.passwordResets.values()) {
      if (r.id === id) {
        r.used_at = new Date();
      }
    }
  }

  // Campuses & Zones
  async listCampuses(): Promise<CampusRecord[]> {
    return Array.from(this.campuses.values());
  }

  async getCampusById(id: string): Promise<CampusRecord | null> {
    return this.campuses.get(id) || null;
  }

  async createCampus(campus: Omit<CampusRecord, 'id' | 'created_at'>): Promise<CampusRecord> {
    const record: CampusRecord = {
      id: uuidv4(),
      ...campus,
      created_at: new Date(),
    };
    this.campuses.set(record.id, record);
    return { ...record };
  }

  async listZones(campusId: string, activeOnly = true): Promise<ZoneRecord[]> {
    return Array.from(this.zones.values()).filter(
      (z) => z.campus_id === campusId && (!activeOnly || z.is_active)
    );
  }

  async getZoneById(id: string): Promise<ZoneRecord | null> {
    return this.zones.get(id) || null;
  }

  async createZone(zone: Omit<ZoneRecord, 'id' | 'created_at'>): Promise<ZoneRecord> {
    const record: ZoneRecord = {
      id: uuidv4(),
      ...zone,
      created_at: new Date(),
    };
    this.zones.set(record.id, record);
    return { ...record };
  }

  async updateZone(id: string, updates: Partial<ZoneRecord>): Promise<ZoneRecord | null> {
    const z = this.zones.get(id);
    if (!z) return null;
    const updated = { ...z, ...updates };
    this.zones.set(id, updated);
    return { ...updated };
  }

  // Readings
  async getReadingById(id: string): Promise<ReadingRecord | null> {
    return this.readings.get(id) || null;
  }

  async createReading(
    reading: ReadingRecord,
    context?: Omit<ReadingNetworkContextRecord, 'reading_id'>
  ): Promise<ReadingRecord> {
    this.readings.set(reading.reading_id, { ...reading });
    if (context) {
      this.contexts.set(reading.reading_id, {
        reading_id: reading.reading_id,
        ...context,
      });
    }
    return { ...reading };
  }

  async createBatchReadings(
    items: Array<{ reading: ReadingRecord; context?: Omit<ReadingNetworkContextRecord, 'reading_id'> }>
  ): Promise<{ accepted: string[]; duplicates: string[]; rejected: Array<{ readingId: string; reason: string }> }> {
    const accepted: string[] = [];
    const duplicates: string[] = [];
    const rejected: Array<{ readingId: string; reason: string }> = [];

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

  async listReadingsForUser(
    userId: string,
    params: { page: number; pageSize: number; from?: Date; to?: Date; zoneId?: string }
  ): Promise<{ readings: ReadingRecord[]; total: number }> {
    let list = Array.from(this.readings.values()).filter((r) => r.user_id === userId);

    if (params.zoneId) {
      list = list.filter((r) => r.zone_id === params.zoneId);
    }
    if (params.from) {
      list = list.filter((r) => r.client_measured_at >= params.from!);
    }
    if (params.to) {
      list = list.filter((r) => r.client_measured_at <= params.to!);
    }

    list.sort((a, b) => b.client_measured_at.getTime() - a.client_measured_at.getTime());
    const start = (params.page - 1) * params.pageSize;
    const paginated = list.slice(start, start + params.pageSize);

    return { readings: paginated, total: list.length };
  }

  // Monitoring Sessions
  async createMonitoringSession(
    session: Omit<MonitoringSessionRecord, 'id' | 'ended_at'>
  ): Promise<MonitoringSessionRecord> {
    const record: MonitoringSessionRecord = {
      id: uuidv4(),
      ...session,
      ended_at: null,
    };
    this.monitoringSessions.set(record.id, record);
    return { ...record };
  }

  async getMonitoringSessionById(id: string): Promise<MonitoringSessionRecord | null> {
    return this.monitoringSessions.get(id) || null;
  }

  async getActiveMonitoringSession(userId: string): Promise<MonitoringSessionRecord | null> {
    const now = new Date();
    for (const session of this.monitoringSessions.values()) {
      if (
        session.user_id === userId &&
        session.status === MonitoringSessionStatus.ACTIVE &&
        session.expires_at > now
      ) {
        return { ...session };
      }
    }
    return null;
  }

  async updateMonitoringSessionStatus(
    id: string,
    status: MonitoringSessionStatus,
    endedAt = new Date()
  ): Promise<MonitoringSessionRecord | null> {
    const session = this.monitoringSessions.get(id);
    if (!session) return null;
    const updated = { ...session, status, ended_at: endedAt };
    this.monitoringSessions.set(id, updated);
    return { ...updated };
  }

  // Issues
  async createIssueReport(
    issue: Omit<IssueReportRecord, 'id' | 'created_at' | 'reviewed_by' | 'reviewed_at' | 'admin_notes'>
  ): Promise<IssueReportRecord> {
    const record: IssueReportRecord = {
      id: uuidv4(),
      ...issue,
      created_at: new Date(),
      reviewed_by: null,
      reviewed_at: null,
      admin_notes: null,
    };
    this.issueReports.set(record.id, record);
    return { ...record };
  }

  async getIssueReportById(id: string): Promise<IssueReportRecord | null> {
    return this.issueReports.get(id) || null;
  }

  async listIssueReports(params: {
    page: number;
    pageSize: number;
    status?: string;
    zoneId?: string;
  }): Promise<{ issues: IssueReportRecord[]; total: number }> {
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

  async updateIssueReport(
    id: string,
    updates: { status: string; adminNotes?: string; reviewedBy?: string; reviewedAt?: Date }
  ): Promise<IssueReportRecord | null> {
    const report = this.issueReports.get(id);
    if (!report) return null;
    const updated: IssueReportRecord = {
      ...report,
      status: updates.status as any,
      admin_notes: updates.adminNotes !== undefined ? updates.adminNotes : report.admin_notes,
      reviewed_by: updates.reviewedBy !== undefined ? updates.reviewedBy : report.reviewed_by,
      reviewed_at: updates.reviewedAt !== undefined ? updates.reviewedAt : report.reviewed_at,
    };
    this.issueReports.set(id, updated);
    return { ...updated };
  }

  // Analytics & Aggregates
  async getCampusHeatmap(
    campusId: string,
    metric: string,
    networkType?: string,
    from?: Date,
    to?: Date
  ): Promise<any[]> {
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

  async getZoneAnalytics(
    zoneId: string,
    metric: string,
    networkType?: string,
    from?: Date,
    to?: Date
  ): Promise<any> {
    let readings = Array.from(this.readings.values()).filter(
      (r) => r.zone_id === zoneId && r.validation_status === ValidationStatus.ACCEPTED
    );

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
    if (sampleCount < env.MIN_SAMPLE_THRESHOLD || distinctDevices < env.MIN_DISTINCT_DEVICES) {
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

    const values: number[] = [];
    for (const r of readings) {
      if (metric === 'download' && r.download_mbps !== null) values.push(Number(r.download_mbps));
      if (metric === 'latency' && r.latency_ms !== null) values.push(Number(r.latency_ms));
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
      if (median < 5) status = 'VERY_POOR';
      else if (median < 15) status = 'POOR';
      else if (median < 30) status = 'UNSTABLE';
    } else if (metric === 'latency') {
      if (median > 300) status = 'VERY_POOR';
      else if (median > 150) status = 'POOR';
      else if (median > 80) status = 'UNSTABLE';
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
  async createAuditLog(log: Omit<AuditLogRecord, 'id' | 'created_at'>): Promise<AuditLogRecord> {
    const record: AuditLogRecord = {
      id: uuidv4(),
      ...log,
      created_at: new Date(),
    };
    this.auditLogs.push(record);
    return { ...record };
  }

  async listAuditLogs(page: number, limit: number): Promise<{ logs: AuditLogRecord[]; total: number }> {
    const list = [...this.auditLogs].reverse();
    const start = (page - 1) * limit;
    const paginated = list.slice(start, start + limit);
    return { logs: paginated, total: list.length };
  }
}
