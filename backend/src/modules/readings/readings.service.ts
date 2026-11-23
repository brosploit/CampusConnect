import { getRepository } from '../../database';
import { ReadingRecord, ReadingNetworkContextRecord } from '../../database/types';
import { ValidationStatus, AuditEventType } from '../../config/constants';
import { AuditLogger } from '../../middleware/auditLogger';

export class ReadingsService {
  /**
   * Ingests a single diagnostic reading with idempotency and zone validation
   */
  static async submitReading(params: {
    userId: string;
    reading: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const repo = getRepository();

    // Verify zone exists and is active
    const zone = await repo.getZoneById(params.reading.zoneId);
    if (!zone || !zone.is_active) {
      const err: any = new Error('The selected campus zone is invalid or inactive.');
      err.statusCode = 400;
      throw err;
    }

    // Idempotency check
    const existing = await repo.getReadingById(params.reading.readingId);
    if (existing) {
      return {
        accepted: true,
        readingId: existing.reading_id,
        duplicate: true,
        receivedAt: existing.received_at,
        validationStatus: existing.validation_status,
      };
    }

    // Outlier / Anomaly detection: flag implausible measurements
    let validationStatus = ValidationStatus.ACCEPTED;
    let validationNotes: string | null = null;

    if (params.reading.downloadMbps !== undefined && params.reading.downloadMbps !== null) {
      if (params.reading.downloadMbps > 2500) {
        validationStatus = ValidationStatus.FLAGGED;
        validationNotes = 'Unusually high throughput observation flagged for review';
      }
    }

    const readingRecord: ReadingRecord = {
      reading_id: params.reading.readingId,
      user_id: params.userId,
      zone_id: params.reading.zoneId,
      network_type: params.reading.networkType,
      download_mbps: params.reading.downloadMbps !== undefined ? params.reading.downloadMbps : null,
      latency_ms: params.reading.latencyMs !== undefined ? params.reading.latencyMs : null,
      measurement_source: params.reading.measurementSource,
      client_measured_at: new Date(params.reading.clientMeasuredAt),
      received_at: new Date(),
      app_version: params.reading.appVersion || null,
      platform_version: params.reading.platformVersion || null,
      validation_status: validationStatus,
      validation_notes: validationNotes,
    };

    let contextRecord: Omit<ReadingNetworkContextRecord, 'reading_id'> | undefined;
    if (params.reading.networkContext) {
      contextRecord = {
        service_state: params.reading.networkContext.serviceState || null,
        signal_dbm: params.reading.networkContext.signalDbm ?? null,
        radio_technology: params.reading.networkContext.radioTechnology || null,
        carrier_label: params.reading.networkContext.carrierLabel || null,
        active_transport: params.reading.networkContext.activeTransport || null,
        internet_capability: params.reading.networkContext.internetCapability ?? null,
        internet_validated: params.reading.networkContext.internetValidated ?? null,
        data_freshness: params.reading.networkContext.dataFreshness || null,
      };
    }

    const saved = await repo.createReading(readingRecord, contextRecord);

    await AuditLogger.log({
      eventType: AuditEventType.READING_SUBMITTED,
      actorId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      resourceType: 'READING',
      resourceId: saved.reading_id,
      metadata: {
        zoneId: saved.zone_id,
        networkType: saved.network_type,
        status: saved.validation_status,
      },
    });

    return {
      accepted: true,
      readingId: saved.reading_id,
      duplicate: false,
      receivedAt: saved.received_at,
      validationStatus: saved.validation_status,
    };
  }

  /**
   * Ingests a batch of offline-synced diagnostic readings
   */
  static async submitBatch(params: {
    userId: string;
    readings: any[];
    ipAddress?: string;
    userAgent?: string;
  }) {
    const repo = getRepository();

    const items = params.readings.map((r) => {
      let validationStatus = ValidationStatus.ACCEPTED;
      let validationNotes: string | null = null;
      if (r.downloadMbps && r.downloadMbps > 2500) {
        validationStatus = ValidationStatus.FLAGGED;
        validationNotes = 'Unusually high throughput observation flagged for review';
      }

      const readingRecord: ReadingRecord = {
        reading_id: r.readingId,
        user_id: params.userId,
        zone_id: r.zoneId,
        network_type: r.networkType,
        download_mbps: r.downloadMbps !== undefined ? r.downloadMbps : null,
        latency_ms: r.latencyMs !== undefined ? r.latencyMs : null,
        measurement_source: r.measurementSource,
        client_measured_at: new Date(r.clientMeasuredAt),
        received_at: new Date(),
        app_version: r.appVersion || null,
        platform_version: r.platformVersion || null,
        validation_status: validationStatus,
        validation_notes: validationNotes,
      };

      let context: Omit<ReadingNetworkContextRecord, 'reading_id'> | undefined;
      if (r.networkContext) {
        context = {
          service_state: r.networkContext.serviceState || null,
          signal_dbm: r.networkContext.signalDbm ?? null,
          radio_technology: r.networkContext.radioTechnology || null,
          carrier_label: r.networkContext.carrierLabel || null,
          active_transport: r.networkContext.activeTransport || null,
          internet_capability: r.networkContext.internetCapability ?? null,
          internet_validated: r.networkContext.internetValidated ?? null,
          data_freshness: r.networkContext.dataFreshness || null,
        };
      }

      return { reading: readingRecord, context };
    });

    const result = await repo.createBatchReadings(items);

    await AuditLogger.log({
      eventType: AuditEventType.READING_BATCH_SUBMITTED,
      actorId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      resourceType: 'READING_BATCH',
      metadata: {
        acceptedCount: result.accepted.length,
        duplicateCount: result.duplicates.length,
        rejectedCount: result.rejected.length,
      },
    });

    return result;
  }
}
