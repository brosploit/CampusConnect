import { v4 as uuidv4 } from 'uuid';
import { pool, query, withTransaction } from './db';
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
  AuditLogRecord,
} from './types';
import { MonitoringSessionStatus, ValidationStatus, UserRole } from '../config/constants';
import { env } from '../config/env';

export class PgRepository implements IRepository {
  // Users
  async createUser(user: Omit<UserRecord, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<UserRecord> {
    const id = uuidv4();
    const rows = await query<UserRecord>(
      `INSERT INTO users (id, email, password_hash, display_name, role, is_verified, is_suspended, mfa_enabled, mfa_secret)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        user.email.toLowerCase().trim(),
        user.password_hash,
        user.display_name,
        user.role,
        user.is_verified,
        user.is_suspended,
        user.mfa_enabled,
        user.mfa_secret,
      ]
    );
    return rows[0];
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    const rows = await query<UserRecord>(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const rows = await query<UserRecord>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL',
      [email.trim()]
    );
    return rows[0] || null;
  }

  async updateUser(id: string, updates: Partial<UserRecord>): Promise<UserRecord | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = $${i}`);
        values.push(val);
        i++;
      }
    }
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const rows = await query<UserRecord>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} AND deleted_at IS NULL RETURNING *`,
      values
    );
    return rows[0] || null;
  }

  async listUsers(page: number, limit: number): Promise<{ users: UserRecord[]; total: number }> {
    const offset = (page - 1) * limit;
    const countRows = await query<{ count: string }>('SELECT COUNT(*) FROM users WHERE deleted_at IS NULL');
    const rows = await query<UserRecord>(
      'SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return { users: rows, total: parseInt(countRows[0].count, 10) };
  }

  // Refresh Tokens
  async createRefreshToken(record: Omit<RefreshTokenRecord, 'id' | 'created_at'>): Promise<RefreshTokenRecord> {
    const id = uuidv4();
    const rows = await query<RefreshTokenRecord>(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, record.user_id, record.token_hash, record.family_id, record.expires_at]
    );
    return rows[0];
  }

  async getRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const rows = await query<RefreshTokenRecord>(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    return rows[0] || null;
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [id]);
  }

  async revokeRefreshTokenFamily(familyId: string): Promise<void> {
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = $1', [familyId]);
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1', [userId]);
    await query('UPDATE users SET tokens_revoked_at = NOW() WHERE id = $1', [userId]);
  }

  // Password Resets
  async createPasswordReset(
    record: Omit<PasswordResetRecord, 'id' | 'created_at' | 'used_at'>
  ): Promise<PasswordResetRecord> {
    const id = uuidv4();
    const rows = await query<PasswordResetRecord>(
      `INSERT INTO password_resets (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, record.user_id, record.token_hash, record.expires_at]
    );
    return rows[0];
  }

  async getPasswordResetByHash(tokenHash: string): Promise<PasswordResetRecord | null> {
    const rows = await query<PasswordResetRecord>(
      'SELECT * FROM password_resets WHERE token_hash = $1',
      [tokenHash]
    );
    return rows[0] || null;
  }

  async markPasswordResetUsed(id: string): Promise<void> {
    await query('UPDATE password_resets SET used_at = NOW() WHERE id = $1', [id]);
  }

  // Campuses & Zones
  async listCampuses(): Promise<CampusRecord[]> {
    return query<CampusRecord>('SELECT * FROM campuses ORDER BY name ASC');
  }

  async getCampusById(id: string): Promise<CampusRecord | null> {
    const rows = await query<CampusRecord>('SELECT * FROM campuses WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async createCampus(campus: Omit<CampusRecord, 'id' | 'created_at'>): Promise<CampusRecord> {
    const id = uuidv4();
    const rows = await query<CampusRecord>(
      'INSERT INTO campuses (id, name, slug, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, campus.name, campus.slug, campus.description]
    );
    return rows[0];
  }

  async listZones(campusId: string, activeOnly = true): Promise<ZoneRecord[]> {
    if (activeOnly) {
      return query<ZoneRecord>(
        'SELECT * FROM zones WHERE campus_id = $1 AND is_active = true ORDER BY name ASC',
        [campusId]
      );
    }
    return query<ZoneRecord>(
      'SELECT * FROM zones WHERE campus_id = $1 ORDER BY name ASC',
      [campusId]
    );
  }

  async getZoneById(id: string): Promise<ZoneRecord | null> {
    const rows = await query<ZoneRecord>('SELECT * FROM zones WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async createZone(zone: Omit<ZoneRecord, 'id' | 'created_at'>): Promise<ZoneRecord> {
    const id = uuidv4();
    const rows = await query<ZoneRecord>(
      `INSERT INTO zones (id, campus_id, building_id, name, description, map_geometry, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, zone.campus_id, zone.building_id, zone.name, zone.description, zone.map_geometry, zone.is_active]
    );
    return rows[0];
  }

  async updateZone(id: string, updates: Partial<ZoneRecord>): Promise<ZoneRecord | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    for (const [key, val] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = $${i}`);
        values.push(val);
        i++;
      }
    }
    values.push(id);
    const rows = await query<ZoneRecord>(
      `UPDATE zones SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return rows[0] || null;
  }

  // Readings
  async getReadingById(id: string): Promise<ReadingRecord | null> {
    const rows = await query<ReadingRecord>('SELECT * FROM readings WHERE reading_id = $1', [id]);
    return rows[0] || null;
  }

  async createReading(
    reading: ReadingRecord,
    context?: Omit<ReadingNetworkContextRecord, 'reading_id'>
  ): Promise<ReadingRecord> {
    return withTransaction(async (client) => {
      const rows = await client.query<ReadingRecord>(
        `INSERT INTO readings (
           reading_id, user_id, zone_id, network_type, download_mbps, latency_ms,
           measurement_source, client_measured_at, app_version, platform_version,
           validation_status, validation_notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          reading.reading_id,
          reading.user_id,
          reading.zone_id,
          reading.network_type,
          reading.download_mbps,
          reading.latency_ms,
          reading.measurement_source,
          reading.client_measured_at,
          reading.app_version,
          reading.platform_version,
          reading.validation_status,
          reading.validation_notes,
        ]
      );

      if (context) {
        await client.query(
          `INSERT INTO reading_network_context (
             reading_id, service_state, signal_dbm, radio_technology, carrier_label,
             active_transport, internet_capability, internet_validated, data_freshness
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            reading.reading_id,
            context.service_state,
            context.signal_dbm,
            context.radio_technology,
            context.carrier_label,
            context.active_transport,
            context.internet_capability,
            context.internet_validated,
            context.data_freshness,
          ]
        );
      }
      return rows.rows[0];
    });
  }

  async createBatchReadings(
    items: Array<{ reading: ReadingRecord; context?: Omit<ReadingNetworkContextRecord, 'reading_id'> }>
  ): Promise<{ accepted: string[]; duplicates: string[]; rejected: Array<{ readingId: string; reason: string }> }> {
    const accepted: string[] = [];
    const duplicates: string[] = [];
    const rejected: Array<{ readingId: string; reason: string }> = [];

    for (const item of items) {
      try {
        const zone = await this.getZoneById(item.reading.zone_id);
        if (!zone || !zone.is_active) {
          rejected.push({ readingId: item.reading.reading_id, reason: 'Invalid or inactive zone' });
          continue;
        }

        const existing = await this.getReadingById(item.reading.reading_id);
        if (existing) {
          duplicates.push(item.reading.reading_id);
          continue;
        }

        await this.createReading(item.reading, item.context);
        accepted.push(item.reading.reading_id);
      } catch (err: any) {
        rejected.push({ readingId: item.reading.reading_id, reason: err.message });
      }
    }
    return { accepted, duplicates, rejected };
  }

  async listReadingsForUser(
    userId: string,
    params: { page: number; pageSize: number; from?: Date; to?: Date; zoneId?: string }
  ): Promise<{ readings: ReadingRecord[]; total: number }> {
    const offset = (params.page - 1) * params.pageSize;
    const conditions = ['user_id = $1'];
    const values: any[] = [userId];
    let i = 2;

    if (params.zoneId) {
      conditions.push(`zone_id = $${i}`);
      values.push(params.zoneId);
      i++;
    }
    if (params.from) {
      conditions.push(`client_measured_at >= $${i}`);
      values.push(params.from);
      i++;
    }
    if (params.to) {
      conditions.push(`client_measured_at <= $${i}`);
      values.push(params.to);
      i++;
    }

    const whereClause = conditions.join(' AND ');
    const countRows = await query<{ count: string }>(
      `SELECT COUNT(*) FROM readings WHERE ${whereClause}`,
      values
    );

    values.push(params.pageSize, offset);
    const rows = await query<ReadingRecord>(
      `SELECT * FROM readings WHERE ${whereClause} ORDER BY client_measured_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      values
    );

    return { readings: rows, total: parseInt(countRows[0].count, 10) };
  }

  // Monitoring Sessions
  async createMonitoringSession(
    session: Omit<MonitoringSessionRecord, 'id' | 'ended_at'>
  ): Promise<MonitoringSessionRecord> {
    const id = uuidv4();
    const rows = await query<MonitoringSessionRecord>(
      `INSERT INTO monitoring_sessions (id, user_id, zone_id, consent_version, consent_at, started_at, expires_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        id,
        session.user_id,
        session.zone_id,
        session.consent_version,
        session.consent_at,
        session.started_at,
        session.expires_at,
        session.status,
      ]
    );
    return rows[0];
  }

  async getMonitoringSessionById(id: string): Promise<MonitoringSessionRecord | null> {
    const rows = await query<MonitoringSessionRecord>('SELECT * FROM monitoring_sessions WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async getActiveMonitoringSession(userId: string): Promise<MonitoringSessionRecord | null> {
    const rows = await query<MonitoringSessionRecord>(
      `SELECT * FROM monitoring_sessions 
       WHERE user_id = $1 AND status = 'ACTIVE' AND expires_at > NOW() 
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  }

  async updateMonitoringSessionStatus(
    id: string,
    status: MonitoringSessionStatus,
    endedAt = new Date()
  ): Promise<MonitoringSessionRecord | null> {
    const rows = await query<MonitoringSessionRecord>(
      `UPDATE monitoring_sessions 
       SET status = $1, ended_at = $2 
       WHERE id = $3 RETURNING *`,
      [status, endedAt, id]
    );
    return rows[0] || null;
  }

  // Issues
  async createIssueReport(
    issue: Omit<IssueReportRecord, 'id' | 'created_at' | 'reviewed_by' | 'reviewed_at' | 'admin_notes'>
  ): Promise<IssueReportRecord> {
    const id = uuidv4();
    const rows = await query<IssueReportRecord>(
      `INSERT INTO issue_reports (id, user_id, zone_id, category, description, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, issue.user_id, issue.zone_id, issue.category, issue.description, issue.status]
    );
    return rows[0];
  }

  async getIssueReportById(id: string): Promise<IssueReportRecord | null> {
    const rows = await query<IssueReportRecord>('SELECT * FROM issue_reports WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async listIssueReports(params: {
    page: number;
    pageSize: number;
    status?: string;
    zoneId?: string;
  }): Promise<{ issues: IssueReportRecord[]; total: number }> {
    const conditions = ['1=1'];
    const values: any[] = [];
    let i = 1;

    if (params.status) {
      conditions.push(`status = $${i}`);
      values.push(params.status);
      i++;
    }
    if (params.zoneId) {
      conditions.push(`zone_id = $${i}`);
      values.push(params.zoneId);
      i++;
    }

    const whereClause = conditions.join(' AND ');
    const countRows = await query<{ count: string }>(`SELECT COUNT(*) FROM issue_reports WHERE ${whereClause}`, values);

    values.push(params.pageSize, (params.page - 1) * params.pageSize);
    const rows = await query<IssueReportRecord>(
      `SELECT * FROM issue_reports WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      values
    );

    return { issues: rows, total: parseInt(countRows[0].count, 10) };
  }

  async updateIssueReport(
    id: string,
    updates: { status: string; adminNotes?: string; reviewedBy?: string; reviewedAt?: Date }
  ): Promise<IssueReportRecord | null> {
    const rows = await query<IssueReportRecord>(
      `UPDATE issue_reports 
       SET status = $1, admin_notes = COALESCE($2, admin_notes), reviewed_by = COALESCE($3, reviewed_by), reviewed_at = COALESCE($4, reviewed_at)
       WHERE id = $5 RETURNING *`,
      [updates.status, updates.adminNotes, updates.reviewedBy, updates.reviewedAt, id]
    );
    return rows[0] || null;
  }

  // Analytics & Heatmap
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
    const conditions = ['zone_id = $1', "validation_status = 'ACCEPTED'"];
    const values: any[] = [zoneId];
    let i = 2;

    if (networkType) {
      conditions.push(`network_type = $${i}`);
      values.push(networkType);
      i++;
    }
    if (from) {
      conditions.push(`client_measured_at >= $${i}`);
      values.push(from);
      i++;
    }
    if (to) {
      conditions.push(`client_measured_at <= $${i}`);
      values.push(to);
      i++;
    }

    const whereClause = conditions.join(' AND ');

    // Differential privacy check: sample count and distinct devices
    const statsRows = await query<{ count: string; distinct_devices: string }>(
      `SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as distinct_devices
       FROM readings WHERE ${whereClause}`,
      values
    );

    const sampleCount = parseInt(statsRows[0]?.count || '0', 10);
    const distinctDevices = parseInt(statsRows[0]?.distinct_devices || '0', 10);

    if (sampleCount < env.MIN_SAMPLE_THRESHOLD || distinctDevices < env.MIN_DISTINCT_DEVICES) {
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

    const col = metric === 'download' ? 'download_mbps' : 'latency_ms';
    const metricRows = await query<{ val: number }>(
      `SELECT ${col} as val FROM readings WHERE ${whereClause} AND ${col} IS NOT NULL ORDER BY ${col} ASC`,
      values
    );

    if (metricRows.length === 0) {
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

    const valuesArr = metricRows.map((r) => Number(r.val));
    const min = valuesArr[0];
    const max = valuesArr[valuesArr.length - 1];
    const mid = Math.floor(valuesArr.length / 2);
    const median = valuesArr.length % 2 !== 0 ? valuesArr[mid] : (valuesArr[mid - 1] + valuesArr[mid]) / 2;

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
      lastUpdatedAt: new Date(),
    };
  }

  // Audit Logs
  async createAuditLog(log: Omit<AuditLogRecord, 'id' | 'created_at'>): Promise<AuditLogRecord> {
    const id = uuidv4();
    const rows = await query<AuditLogRecord>(
      `INSERT INTO audit_logs (id, event_type, actor_id, actor_role, ip_address, user_agent, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        id,
        log.event_type,
        log.actor_id,
        log.actor_role,
        log.ip_address,
        log.user_agent,
        log.resource_type,
        log.resource_id,
        log.metadata ? JSON.stringify(log.metadata) : null,
      ]
    );
    return rows[0];
  }

  async listAuditLogs(page: number, limit: number): Promise<{ logs: AuditLogRecord[]; total: number }> {
    const offset = (page - 1) * limit;
    const countRows = await query<{ count: string }>('SELECT COUNT(*) FROM audit_logs');
    const rows = await query<AuditLogRecord>(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return { logs: rows, total: parseInt(countRows[0].count, 10) };
  }
}
