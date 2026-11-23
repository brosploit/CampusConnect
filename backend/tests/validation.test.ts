import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../src/app';
import { setRepository } from '../src/database';
import { MemoryRepository } from '../src/database/memoryDb';
import { UserRole } from '../src/config/constants';
import { PasswordService } from '../src/modules/auth/password.service';
import { TokenService } from '../src/modules/auth/token.service';

describe('Validation, SQLi & ReDoS Defense Tests', () => {
  let app: any;
  let repo: MemoryRepository;
  let studentToken: string;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    repo = new MemoryRepository();
    setRepository(repo);
    app = createApp();

    const student = await repo.createUser({
      email: 'student_val@campus.edu',
      password_hash: await PasswordService.hashPassword('Pass123!@#456'),
      display_name: 'Student Val',
      role: UserRole.STUDENT,
      is_verified: true,
      is_suspended: false,
      mfa_enabled: false,
      mfa_secret: null,
      tokens_revoked_at: null,
    });

    studentToken = TokenService.generateAccessToken({
      sub: student.id,
      email: student.email,
      role: student.role,
      isVerified: true,
      mfaVerified: true,
    });
  });

  test('Mass assignment defense: Extra/unauthorized attributes are stripped by schema validation', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'attacker_mass@campus.edu',
        password: 'Password123!@#',
        role: UserRole.STUDENT,
        // Attempting to elevate to administrator or inject unauthorized db columns
        is_suspended: false,
        is_verified: true,
        tokens_revoked_at: new Date().toISOString(),
        unauthorizedColumn: 'malicious',
      });

    // Zod .strict() rejects unknown properties
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
  });

  test('SQL injection resilience: SQL injection payloads in query and path params are safely handled', async () => {
    const sqliVectors = [
      "' OR '1'='1",
      "'; DROP TABLE readings; --",
      "1' UNION SELECT * FROM users; --",
      "admin' --",
    ];

    for (const vector of sqliVectors) {
      // Query param test
      const res1 = await request(app)
        .get(`/api/v1/zones/22222222-2222-2222-2222-222222222222/analytics?metric=${encodeURIComponent(vector)}`);
      // Zod schema rejects non-enum metric values with 400
      assert.strictEqual(res1.status, 400);

      // Path param test
      const res2 = await request(app)
        .get(`/api/v1/zones/${encodeURIComponent(vector)}`);
      // Zod UUID schema rejects malformed UUID with 400
      assert.strictEqual(res2.status, 400);
    }
  });

  test('ReDoS resilience: Extremely long regex strings are rejected within milliseconds', async () => {
    const evilRegexString = 'a'.repeat(5000) + '!';
    const start = Date.now();

    const res = await request(app)
      .post('/api/v1/readings')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        readingId: '44444444-4444-4444-4444-444444444441',
        zoneId: '22222222-2222-2222-2222-222222222222',
        networkType: 'WIFI',
        measurementSource: 'APP_TEST',
        clientMeasuredAt: new Date().toISOString(),
        appVersion: evilRegexString,
      });

    const duration = Date.now() - start;
    assert.strictEqual(res.status, 400);
    assert.ok(duration < 200, `Execution took too long: ${duration}ms`);
  });

  test('Request body size limit enforces 100KB ceiling (rejects oversized payloads with 413)', async () => {
    const hugeDescription = 'X'.repeat(150 * 1024); // 150KB string > 100KB limit

    const res = await request(app)
      .post('/api/v1/issues')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        zoneId: '22222222-2222-2222-2222-222222222222',
        category: 'POOR_SIGNAL',
        description: hugeDescription,
      });

    assert.strictEqual(res.status, 413);
  });
});
