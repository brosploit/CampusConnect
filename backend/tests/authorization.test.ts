import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../src/app';
import { setRepository } from '../src/database';
import { MemoryRepository } from '../src/database/memoryDb';
import { UserRole } from '../src/config/constants';
import { PasswordService } from '../src/modules/auth/password.service';
import { TokenService } from '../src/modules/auth/token.service';

describe('Authorization & Access Control Security Tests', () => {
  let app: any;
  let repo: MemoryRepository;
  let studentToken: string;
  let moderatorToken: string;
  let adminToken: string;
  let studentId: string;
  let student2Id: string;
  let student2Token: string;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    repo = new MemoryRepository();
    setRepository(repo);
    app = createApp();

    // Create student 1
    const student = await repo.createUser({
      email: 'student_auth@campus.edu',
      password_hash: await PasswordService.hashPassword('Pass123!@#456'),
      display_name: 'Student One',
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

    // Create student 2
    const student2 = await repo.createUser({
      email: 'student_auth2@campus.edu',
      password_hash: await PasswordService.hashPassword('Pass123!@#456'),
      display_name: 'Student Two',
      role: UserRole.STUDENT,
      is_verified: true,
      is_suspended: false,
      mfa_enabled: false,
      mfa_secret: null,
      tokens_revoked_at: null,
    });
    student2Id = student2.id;
    student2Token = TokenService.generateAccessToken({
      sub: student2.id,
      email: student2.email,
      role: student2.role,
      isVerified: true,
      mfaVerified: true,
    });

    // Create moderator
    const mod = await repo.createUser({
      email: 'mod_auth@campus.edu',
      password_hash: await PasswordService.hashPassword('Pass123!@#456'),
      display_name: 'Moderator One',
      role: UserRole.MODERATOR,
      is_verified: true,
      is_suspended: false,
      mfa_enabled: false,
      mfa_secret: null,
      tokens_revoked_at: null,
    });
    moderatorToken = TokenService.generateAccessToken({
      sub: mod.id,
      email: mod.email,
      role: mod.role,
      isVerified: true,
      mfaVerified: true,
    });

    // Create administrator
    const admin = await repo.createUser({
      email: 'admin_auth@campus.edu',
      password_hash: await PasswordService.hashPassword('Pass123!@#456'),
      display_name: 'Admin One',
      role: UserRole.ADMINISTRATOR,
      is_verified: true,
      is_suspended: false,
      mfa_enabled: false,
      mfa_secret: null,
      tokens_revoked_at: null,
    });
    adminToken = TokenService.generateAccessToken({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      isVerified: true,
      mfaVerified: true,
    });
  });

  test('BFLA: Student cannot access administrative endpoints (returns 403 Forbidden)', async () => {
    const adminEndpoints = [
      { method: 'get', path: '/api/v1/admin/issues' },
      { method: 'post', path: '/api/v1/admin/zones', body: { name: 'Hack Zone', campusId: '11111111-1111-1111-1111-111111111111' } },
      { method: 'get', path: '/api/v1/admin/audit-logs' },
      { method: 'patch', path: `/api/v1/admin/users/${studentId}/suspend`, body: { isSuspended: true, reason: 'test' } },
    ];

    for (const ep of adminEndpoints) {
      const req = (request(app) as any)[ep.method](ep.path).set('Authorization', `Bearer ${studentToken}`);
      if (ep.body) req.send(ep.body);

      const res = await req;
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    }
  });

  test('BFLA: Moderator can manage zones and issues but CANNOT suspend users or view audit logs', async () => {
    // Moderator can access issue reports
    const issueListRes = await request(app)
      .get('/api/v1/admin/issues')
      .set('Authorization', `Bearer ${moderatorToken}`);
    assert.strictEqual(issueListRes.status, 200);

    // Moderator cannot view system audit logs
    const auditRes = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${moderatorToken}`);
    assert.strictEqual(auditRes.status, 403);

    // Moderator cannot suspend users
    const suspendRes = await request(app)
      .patch(`/api/v1/admin/users/${studentId}/suspend`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .send({ isSuspended: true, reason: 'unauthorized attempt' });
    assert.strictEqual(suspendRes.status, 403);
  });

  test('BOLA: Student A cannot stop Student B monitoring session', async () => {
    // Student B starts an active monitoring session
    const sessionRes = await request(app)
      .post('/api/v1/monitoring/sessions')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({
        zoneId: '22222222-2222-2222-2222-222222222222',
        consentVersion: 'v1.0',
        requestedDurationMinutes: 15,
      });

    assert.strictEqual(sessionRes.status, 201);
    const sessionBId = sessionRes.body.sessionId;

    // Student A attempts to stop Student B's session by ID
    const stopRes = await request(app)
      .post(`/api/v1/monitoring/sessions/${sessionBId}/stop`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(stopRes.status, 403);
    assert.strictEqual(stopRes.body.error.code, 'FORBIDDEN');

    // Confirm session is still ACTIVE
    const active = await repo.getMonitoringSessionById(sessionBId);
    assert.strictEqual(active?.status, 'ACTIVE');

    // Student B can stop their own session
    const ownStopRes = await request(app)
      .post(`/api/v1/monitoring/sessions/${sessionBId}/stop`)
      .set('Authorization', `Bearer ${student2Token}`);
    assert.strictEqual(ownStopRes.status, 200);
    assert.strictEqual(ownStopRes.body.status, 'STOPPED');
  });

  test('BOLA: Student calling /readings/mine receives strictly own reading history', async () => {
    // Ingest reading for Student 1
    await repo.createReading({
      reading_id: '55555555-5555-5555-5555-555555555551',
      user_id: studentId,
      zone_id: '22222222-2222-2222-2222-222222222222',
      network_type: 'WIFI' as any,
      download_mbps: 25.5,
      latency_ms: 20,
      measurement_source: 'APP_TEST' as any,
      client_measured_at: new Date(),
      received_at: new Date(),
      app_version: '1.0.0',
      platform_version: 'Android 15',
      validation_status: 'ACCEPTED' as any,
      validation_notes: null,
    });

    // Ingest reading for Student 2
    await repo.createReading({
      reading_id: '55555555-5555-5555-5555-555555555552',
      user_id: student2Id,
      zone_id: '22222222-2222-2222-2222-222222222222',
      network_type: 'MOBILE' as any,
      download_mbps: 45.2,
      latency_ms: 30,
      measurement_source: 'APP_TEST' as any,
      client_measured_at: new Date(),
      received_at: new Date(),
      app_version: '1.0.0',
      platform_version: 'Android 15',
      validation_status: 'ACCEPTED' as any,
      validation_notes: null,
    });

    const res1 = await request(app)
      .get('/api/v1/readings/mine')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.readings.length, 1);
    assert.strictEqual(res1.body.readings[0].readingId, '55555555-5555-5555-5555-555555555551');

    const res2 = await request(app)
      .get('/api/v1/readings/mine')
      .set('Authorization', `Bearer ${student2Token}`);
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.readings.length, 1);
    assert.strictEqual(res2.body.readings[0].readingId, '55555555-5555-5555-5555-555555555552');
  });
});
