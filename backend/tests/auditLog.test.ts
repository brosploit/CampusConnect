import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../src/app';
import { setRepository } from '../src/database';
import { MemoryRepository } from '../src/database/memoryDb';
import { AuditLogger } from '../src/middleware/auditLogger';
import { UserRole } from '../src/config/constants';
import { PasswordService } from '../src/modules/auth/password.service';
import { TokenService } from '../src/modules/auth/token.service';

describe('Security Audit Logging & Redaction Tests', () => {
  let app: any;
  let repo: MemoryRepository;
  let adminToken: string;
  let adminId: string;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    repo = new MemoryRepository();
    setRepository(repo);
    app = createApp();

    const admin = await repo.createUser({
      email: 'admin_audit@campus.edu',
      password_hash: await PasswordService.hashPassword('AdminPass123!@#'),
      display_name: 'Audit Admin',
      role: UserRole.ADMINISTRATOR,
      is_verified: true,
      is_suspended: false,
      mfa_enabled: false,
      mfa_secret: null,
      tokens_revoked_at: null,
    });
    adminId = admin.id;
    adminToken = TokenService.generateAccessToken({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      isVerified: true,
      mfaVerified: true,
    });
  });

  test('AuditLogger.redact properly redacts sensitive passwords, tokens, and authorization headers', () => {
    const rawPayload = {
      username: 'student',
      password: 'SuperSecretPassword!',
      access_token: 'jwt.token.string',
      refresh_token: 'secret-refresh-hex',
      authorization: 'Bearer token',
      nested: {
        password_hash: '$argon2id$...',
        mfa_secret: 'JBSWY3DPEHPK3PXP',
        safeProperty: 'visible',
      },
    };

    const redacted = AuditLogger.redact(rawPayload);

    assert.strictEqual(redacted.password, '[REDACTED]');
    assert.strictEqual(redacted.access_token, '[REDACTED]');
    assert.strictEqual(redacted.refresh_token, '[REDACTED]');
    assert.strictEqual(redacted.authorization, '[REDACTED]');
    assert.strictEqual(redacted.nested.password_hash, '[REDACTED]');
    assert.strictEqual(redacted.nested.mfa_secret, '[REDACTED]');
    assert.strictEqual(redacted.nested.safeProperty, 'visible');
  });

  test('Administrative actions create immutable audit logs queryable by administrator', async () => {
    // Admin creates a new zone
    const createRes = await request(app)
      .post('/api/v1/admin/zones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campusId: '11111111-1111-1111-1111-111111111111',
        name: 'New Science Block',
        description: 'New building wing',
      });
    assert.strictEqual(createRes.status, 201);

    // Admin queries audit logs
    const auditRes = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(auditRes.status, 200);
    assert.ok(auditRes.body.logs.length > 0);

    const zoneCreationLog = auditRes.body.logs.find(
      (l: any) => l.event_type === 'ADMIN_ZONE_CREATED'
    );
    assert.ok(zoneCreationLog);
    assert.strictEqual(zoneCreationLog.actor_id, adminId);
    assert.strictEqual(zoneCreationLog.resource_type, 'ZONE');
  });
});
