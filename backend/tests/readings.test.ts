import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../src/app';
import { setRepository } from '../src/database';
import { MemoryRepository } from '../src/database/memoryDb';
import { UserRole } from '../src/config/constants';
import { PasswordService } from '../src/modules/auth/password.service';
import { TokenService } from '../src/modules/auth/token.service';

describe('Readings Ingestion & Analytics Privacy Tests', () => {
  let app: any;
  let repo: MemoryRepository;
  let studentToken: string;
  let studentId: string;
  const validZoneId = '22222222-2222-2222-2222-222222222222';

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    repo = new MemoryRepository();
    setRepository(repo);
    app = createApp();

    const student = await repo.createUser({
      email: 'student_reading@campus.edu',
      password_hash: await PasswordService.hashPassword('Pass123!@#456'),
      display_name: 'Student Reader',
      role: UserRole.STUDENT,
      is_verified: true,
      is_suspended: false,
      mfa_enabled: false,
      mfa_secret: null,
      tokens_revoked_at: null,
    });
    studentId = student.id;
    studentToken = TokenService.generateAccessToken({
      sub: student.id,
      email: student.email,
      role: student.role,
      isVerified: true,
      mfaVerified: true,
    });
  });

  test('Valid manual reading submission succeeds and persists data', async () => {
    const readingId = '44444444-4444-4444-4444-444444444441';
    const res = await request(app)
      .post('/api/v1/readings')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        readingId,
        zoneId: validZoneId,
        networkType: 'MOBILE',
        downloadMbps: 22.5,
        latencyMs: 65,
        measurementSource: 'APP_TEST',
        clientMeasuredAt: new Date().toISOString(),
        appVersion: '1.0.0',
        platformVersion: 'Android 15',
        networkContext: {
          serviceState: 'IN_SERVICE',
          signalDbm: -95,
          radioTechnology: 'LTE',
          carrierLabel: 'Campus Mobile',
          activeTransport: 'CELLULAR',
        },
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.accepted, true);
    assert.strictEqual(res.body.duplicate, false);
    assert.strictEqual(res.body.readingId, readingId);
    assert.strictEqual(res.body.validationStatus, 'ACCEPTED');

    const stored = await repo.getReadingById(readingId);
    assert.ok(stored);
    assert.strictEqual(stored.download_mbps, 22.5);
  });

  test('Idempotent submission: submitting identical readingId returns duplicate: true without error', async () => {
    const readingId = '44444444-4444-4444-4444-444444444442';
    const payload = {
      readingId,
      zoneId: validZoneId,
      networkType: 'WIFI',
      downloadMbps: 45.0,
      latencyMs: 15,
      measurementSource: 'APP_TEST',
      clientMeasuredAt: new Date().toISOString(),
    };

    // First attempt
    const res1 = await request(app)
      .post('/api/v1/readings')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(payload);
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.duplicate, false);

    // Second attempt (idempotent replay)
    const res2 = await request(app)
      .post('/api/v1/readings')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(payload);
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.duplicate, true);
    assert.strictEqual(res2.body.readingId, readingId);
  });

  test('Privacy Invariant: Prohibits collection of hardware identifiers (IMEI, IMSI) and GPS', async () => {
    const prohibitedPayloads = [
      { imei: '123456789012345' },
      { imsi: '310150123456789' },
      { latitude: 37.7749, longitude: -122.4194 },
      { gps: '37.7749,-122.4194' },
      { phoneNumber: '+1234567890' },
      { mac: '00:1B:44:11:3A:B7' },
    ];

    for (const item of prohibitedPayloads) {
      const res = await request(app)
        .post('/api/v1/readings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          readingId: '44444444-4444-4444-4444-444444444443',
          zoneId: validZoneId,
          networkType: 'WIFI',
          clientMeasuredAt: new Date().toISOString(),
          measurementSource: 'APP_TEST',
          ...item,
        });

      // Zod schema in .strict() mode rejects unknown / prohibited fields
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    }
  });

  test('Validation bounds: Rejects negative speeds, negative latency, and stale timestamps', async () => {
    // Negative speed
    const negSpeedRes = await request(app)
      .post('/api/v1/readings')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        readingId: '44444444-4444-4444-4444-444444444444',
        zoneId: validZoneId,
        networkType: 'WIFI',
        downloadMbps: -10,
        measurementSource: 'APP_TEST',
        clientMeasuredAt: new Date().toISOString(),
      });
    assert.strictEqual(negSpeedRes.status, 400);

    // Negative latency
    const negLatRes = await request(app)
      .post('/api/v1/readings')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        readingId: '44444444-4444-4444-4444-444444444445',
        zoneId: validZoneId,
        networkType: 'WIFI',
        latencyMs: -5,
        measurementSource: 'APP_TEST',
        clientMeasuredAt: new Date().toISOString(),
      });
    assert.strictEqual(negLatRes.status, 400);

    // Timestamp 10 days in the past (exceeds 7-day offline window)
    const staleTime = new Date(Date.now() - 10 * 86400000).toISOString();
    const staleRes = await request(app)
      .post('/api/v1/readings')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        readingId: '44444444-4444-4444-4444-444444444446',
        zoneId: validZoneId,
        networkType: 'WIFI',
        clientMeasuredAt: staleTime,
        measurementSource: 'APP_TEST',
      });
    assert.strictEqual(staleRes.status, 400);
  });

  test('Batch upload respects 50 items maximum limit and handles duplicates gracefully', async () => {
    // Attempt batch > 50 items (51 items)
    const oversizedBatch = Array.from({ length: 51 }).map((_, i) => ({
      readingId: `55555555-5555-5555-5555-${String(i).padStart(12, '0')}`,
      zoneId: validZoneId,
      networkType: 'WIFI',
      measurementSource: 'APP_TEST',
      clientMeasuredAt: new Date().toISOString(),
    }));

    const overRes = await request(app)
      .post('/api/v1/readings/batch')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ readings: oversizedBatch });
    assert.strictEqual(overRes.status, 400);

    // Valid batch of 3 items
    const validBatch = Array.from({ length: 3 }).map((_, i) => ({
      readingId: `66666666-6666-6666-6666-${String(i).padStart(12, '0')}`,
      zoneId: validZoneId,
      networkType: 'WIFI',
      measurementSource: 'APP_TEST',
      clientMeasuredAt: new Date().toISOString(),
    }));

    const batchRes = await request(app)
      .post('/api/v1/readings/batch')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ readings: validBatch });

    assert.strictEqual(batchRes.status, 200);
    assert.strictEqual(batchRes.body.accepted.length, 3);
    assert.strictEqual(batchRes.body.duplicates.length, 0);

    // Re-sending same batch reports them as duplicates
    const replayBatchRes = await request(app)
      .post('/api/v1/readings/batch')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ readings: validBatch });

    assert.strictEqual(replayBatchRes.status, 200);
    assert.strictEqual(replayBatchRes.body.duplicates.length, 3);
    assert.strictEqual(replayBatchRes.body.accepted.length, 0);
  });

  test('Differential privacy & k-anonymity: Zone status is INSUFFICIENT_DATA until k >= 5 across >= 3 devices', async () => {
    // Query analytics for zone with 0 readings
    const emptyRes = await request(app).get(`/api/v1/zones/${validZoneId}/analytics`);
    assert.strictEqual(emptyRes.status, 200);
    assert.strictEqual(emptyRes.body.status, 'INSUFFICIENT_DATA');
    assert.strictEqual(emptyRes.body.sampleCount, 0);

    // Add 4 readings from 2 devices (still below threshold of 5 readings & 3 devices)
    for (let i = 0; i < 4; i++) {
      await repo.createReading({
        reading_id: `77777777-7777-7777-7777-${String(i).padStart(12, '0')}`,
        user_id: i % 2 === 0 ? 'user-device-1' : 'user-device-2',
        zone_id: validZoneId,
        network_type: 'WIFI' as any,
        download_mbps: 35.0,
        latency_ms: 25,
        measurement_source: 'APP_TEST' as any,
        clientMeasuredAt: new Date(),
        received_at: new Date(),
        app_version: '1.0.0',
        platform_version: 'Android 15',
        validation_status: 'ACCEPTED' as any,
        validation_notes: null,
      });
    }

    const partialRes = await request(app).get(`/api/v1/zones/${validZoneId}/analytics`);
    assert.strictEqual(partialRes.status, 200);
    assert.strictEqual(partialRes.body.status, 'INSUFFICIENT_DATA');
    assert.strictEqual(partialRes.body.sampleCount, 4);

    // Add 5th reading from a 3rd distinct device (meets k=5, devices=3)
    await repo.createReading({
      reading_id: '77777777-7777-7777-7777-000000000099',
      user_id: 'user-device-3',
      zone_id: validZoneId,
      network_type: 'WIFI' as any,
      download_mbps: 40.0,
      latency_ms: 22,
      measurement_source: 'APP_TEST' as any,
      clientMeasuredAt: new Date(),
      received_at: new Date(),
      app_version: '1.0.0',
      platform_version: 'Android 15',
      validation_status: 'ACCEPTED' as any,
      validation_notes: null,
    });

    const fullRes = await request(app).get(`/api/v1/zones/${validZoneId}/analytics`);
    assert.strictEqual(fullRes.status, 200);
    assert.strictEqual(fullRes.body.status, 'GOOD');
    assert.strictEqual(fullRes.body.sampleCount, 5);
    assert.ok(fullRes.body.median > 0);
  });

  test('Diagnostic neutrality: Response copy never claims jammer or interference attacks', async () => {
    const res = await request(app).get(`/api/v1/campuses/11111111-1111-1111-1111-111111111111/heatmap`);
    assert.strictEqual(res.status, 200);

    const bodyString = JSON.stringify(res.body).toLowerCase();
    assert.ok(!bodyString.includes('jammer'));
    assert.ok(!bodyString.includes('sabotage'));
    assert.ok(!bodyString.includes('attack'));
  });
});
