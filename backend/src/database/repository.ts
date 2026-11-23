import {
  CampusRecord,
  BuildingRecord,
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

export interface IRepository {
  // Users
  createUser(user: Omit<UserRecord, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<UserRecord>;
  getUserById(id: string): Promise<UserRecord | null>;
  getUserByEmail(email: string): Promise<UserRecord | null>;
  updateUser(id: string, updates: Partial<UserRecord>): Promise<UserRecord | null>;
  listUsers(page: number, limit: number): Promise<{ users: UserRecord[]; total: number }>;

  // Refresh Tokens
  createRefreshToken(record: Omit<RefreshTokenRecord, 'id' | 'created_at'>): Promise<RefreshTokenRecord>;
  getRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshToken(id: string): Promise<void>;
  revokeRefreshTokenFamily(familyId: string): Promise<void>;
  revokeAllUserRefreshTokens(userId: string): Promise<void>;

  // Password Resets
  createPasswordReset(record: Omit<PasswordResetRecord, 'id' | 'created_at' | 'used_at'>): Promise<PasswordResetRecord>;
  getPasswordResetByHash(tokenHash: string): Promise<PasswordResetRecord | null>;
  markPasswordResetUsed(id: string): Promise<void>;

  // Campuses & Zones
  listCampuses(): Promise<CampusRecord[]>;
  getCampusById(id: string): Promise<CampusRecord | null>;
  createCampus(campus: Omit<CampusRecord, 'id' | 'created_at'>): Promise<CampusRecord>;
  listZones(campusId: string, activeOnly?: boolean): Promise<ZoneRecord[]>;
  getZoneById(id: string): Promise<ZoneRecord | null>;
  createZone(zone: Omit<ZoneRecord, 'id' | 'created_at'>): Promise<ZoneRecord>;
  updateZone(id: string, updates: Partial<ZoneRecord>): Promise<ZoneRecord | null>;

  // Readings
  getReadingById(id: string): Promise<ReadingRecord | null>;
  createReading(
    reading: ReadingRecord,
    context?: Omit<ReadingNetworkContextRecord, 'reading_id'>
  ): Promise<ReadingRecord>;
  createBatchReadings(
    items: Array<{ reading: ReadingRecord; context?: Omit<ReadingNetworkContextRecord, 'reading_id'> }>
  ): Promise<{ accepted: string[]; duplicates: string[]; rejected: Array<{ readingId: string; reason: string }> }>;
  listReadingsForUser(
    userId: string,
    params: { page: number; pageSize: number; from?: Date; to?: Date; zoneId?: string }
  ): Promise<{ readings: ReadingRecord[]; total: number }>;

  // Monitoring Sessions
  createMonitoringSession(
    session: Omit<MonitoringSessionRecord, 'id' | 'ended_at'>
  ): Promise<MonitoringSessionRecord>;
  getMonitoringSessionById(id: string): Promise<MonitoringSessionRecord | null>;
  getActiveMonitoringSession(userId: string): Promise<MonitoringSessionRecord | null>;
  updateMonitoringSessionStatus(id: string, status: string, endedAt?: Date): Promise<MonitoringSessionRecord | null>;

  // Issues
  createIssueReport(
    issue: Omit<IssueReportRecord, 'id' | 'created_at' | 'reviewed_by' | 'reviewed_at' | 'admin_notes'>
  ): Promise<IssueReportRecord>;
  getIssueReportById(id: string): Promise<IssueReportRecord | null>;
  listIssueReports(params: {
    page: number;
    pageSize: number;
    status?: string;
    zoneId?: string;
  }): Promise<{ issues: IssueReportRecord[]; total: number }>;
  updateIssueReport(
    id: string,
    updates: { status: string; adminNotes?: string; reviewedBy?: string; reviewedAt?: Date }
  ): Promise<IssueReportRecord | null>;

  // Analytics & Aggregates
  getCampusHeatmap(
    campusId: string,
    metric: string,
    networkType?: string,
    from?: Date,
    to?: Date
  ): Promise<any[]>;
  getZoneAnalytics(
    zoneId: string,
    metric: string,
    networkType?: string,
    from?: Date,
    to?: Date
  ): Promise<any>;

  // Audit Logs
  createAuditLog(log: Omit<AuditLogRecord, 'id' | 'created_at'>): Promise<AuditLogRecord>;
  listAuditLogs(page: number, limit: number): Promise<{ logs: AuditLogRecord[]; total: number }>;

  // Reset / Clear (For testing only)
  clearAll?(): Promise<void>;
}
