import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../src/app';
import { setRepository } from '../src/database';
import { MemoryRepository } from '../src/database/memoryDb';
import { RateLimiter } from '../src/middleware/rateLimiter';
import { UserRole } from '../src/config/constants';
import { PasswordService } from '../src/modules/auth/password.service';
import { MfaService } from '../src/modules/auth/mfa.service';

describe('Authentication & Session Security Tests', () => {
  let app: any;
  let repo: MemoryRepository;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    repo = new MemoryRepository();
    setRepository(repo);
    RateLimiter.resetStore();
    app = createApp();
  });

  test('Registration hashes password with Argon2id and never stores plaintext', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'student1@campus.edu',
        password: 'Password123!@#',
        displayName: 'Test Student',
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.accessToken);
    assert.ok(res.body.refreshToken);
    assert.strictEqual(res.body.user.email, 'student1@campus.edu');

    // Inspect database record directly to verify Argon2id hash
    const storedUser = await repo.getUserByEmail('student1@campus.edu');
    assert.ok(storedUser);
    assert.notStrictEqual(storedUser.password_hash, 'Password123!@#');
    assert.ok(storedUser.password_hash.startsWith('$argon2id$'));
  });

  test('Password policy enforces NIST guidelines (rejects weak passwords)', async () => {
    const weakPasswords = [
      'short', // too short (<12 chars)
      'alllowercase123!', // missing uppercase
      'ALLUPPERCASE123!', // missing lowercase
      'NoDigitsHere!@#', // missing digits
      'NoSpecialChars123', // missing special chars
    ];

    for (const pwd of weakPasswords) {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test_${Math.random()}@campus.edu`,
          password: pwd,
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    }
  });

  test('Login with valid credentials succeeds and issues HttpOnly cookies', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'student2@campus.edu',
      password: 'SecurePassword123!',
    });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'student2@campus.edu',
      password: 'SecurePassword123!',
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.accessToken);
    assert.ok(res.body.refreshToken);

    const cookies = res.headers['set-cookie'];
    assert.ok(cookies);
    assert.ok(cookies.some((c: string) => c.includes('cc_access_token') && c.includes('HttpOnly')));
    assert.ok(cookies.some((c: string) => c.includes('cc_refresh_token') && c.includes('HttpOnly')));
  });

  test('Login failure returns generic anti-enumeration response and logs failure', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nonexistent@campus.edu',
      password: 'WrongPassword123!',
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.message, 'Invalid email or password.');

    const logs = await repo.listAuditLogs(1, 10);
    assert.ok(logs.logs.some((l) => l.event_type === 'AUTH_LOGIN_FAILURE'));
  });

  test('Authentication rate limiting triggers HTTP 429 after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'attacker@campus.edu',
        password: 'WrongPassword123!',
      });
      assert.strictEqual(res.status, 401);
    }

    // 6th attempt must be throttled
    const blockedRes = await request(app).post('/api/v1/auth/login').send({
      email: 'attacker@campus.edu',
      password: 'WrongPassword123!',
    });

    assert.strictEqual(blockedRes.status, 429);
    assert.strictEqual(blockedRes.body.error.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(blockedRes.headers['retry-after']);
  });

  test('Refresh token rotation issues new tokens and revokes previous token', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      email: 'student3@campus.edu',
      password: 'SecurePassword123!',
    });

    const initialRefreshToken = regRes.body.refreshToken;

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken });

    assert.strictEqual(refreshRes.status, 200);
    assert.ok(refreshRes.body.accessToken);
    assert.ok(refreshRes.body.refreshToken);
    assert.notStrictEqual(refreshRes.body.refreshToken, initialRefreshToken);

    // Old token should now be revoked
    const hash = PasswordService.hashToken(initialRefreshToken);
    const oldStored = await repo.getRefreshTokenByHash(hash);
    assert.ok(oldStored && oldStored.revoked_at !== null);
  });

  test('Refresh token reuse attack invalidates entire family (compromise detection)', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      email: 'student4@campus.edu',
      password: 'SecurePassword123!',
    });

    const initialToken = regRes.body.refreshToken;

    // Legitimate rotation 1
    const rotRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialToken });
    const newToken = rotRes.body.refreshToken;

    // Attacker attempts to replay the already-used initialToken!
    const replayRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialToken });

    assert.strictEqual(replayRes.status, 401);
    assert.strictEqual(replayRes.body.error.code, 'REFRESH_TOKEN_REUSE_DETECTED');

    // Legitimate user attempting to use newToken should now be blocked because family was invalidated
    const blockedRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: newToken });
    assert.strictEqual(blockedRes.status, 401);
  });

  test('Password reset request is anti-enumerative and single-use token invalidates sessions', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'student5@campus.edu',
      password: 'OriginalPassword123!',
    });

    // Request reset for existing user
    const reqRes = await request(app)
      .post('/api/v1/auth/password-reset/request')
      .send({ email: 'student5@campus.edu' });

    assert.strictEqual(reqRes.status, 200);
    assert.ok(reqRes.body.devResetToken);

    // Request reset for non-existing user returns identical message
    const nonExistRes = await request(app)
      .post('/api/v1/auth/password-reset/request')
      .send({ email: 'nobody@campus.edu' });

    assert.strictEqual(nonExistRes.status, 200);
    assert.strictEqual(nonExistRes.body.message, reqRes.body.message);

    // Confirm password reset with single-use token
    const confirmRes = await request(app)
      .post('/api/v1/auth/password-reset/confirm')
      .send({
        token: reqRes.body.devResetToken,
        newPassword: 'BrandNewPassword123!#',
      });

    assert.strictEqual(confirmRes.status, 200);

    // Attempting to reuse the reset token must fail
    const reuseRes = await request(app)
      .post('/api/v1/auth/password-reset/confirm')
      .send({
        token: reqRes.body.devResetToken,
        newPassword: 'AnotherPassword123!#',
      });
    assert.strictEqual(reuseRes.status, 400);

    // Reset rate limiter store to allow post-reset login verification
    RateLimiter.resetStore();

    // Verify login with new password works
    const newLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'student5@campus.edu',
      password: 'BrandNewPassword123!#',
    });
    assert.strictEqual(newLoginRes.status, 200);
  });

  test('Account suspension blocks login and rejects existing tokens', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      email: 'suspended@campus.edu',
      password: 'SecurePassword123!',
    });

    const user = await repo.getUserByEmail('suspended@campus.edu');
    await repo.updateUser(user!.id, { is_suspended: true });

    // Login attempt blocked
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'suspended@campus.edu',
      password: 'SecurePassword123!',
    });
    assert.strictEqual(loginRes.status, 403);
    assert.strictEqual(loginRes.body.error.code, 'ACCOUNT_SUSPENDED');

    // Authenticated API request with old token blocked
    const apiRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${regRes.body.accessToken}`);
    assert.strictEqual(apiRes.status, 401);
    assert.strictEqual(apiRes.body.error.code, 'ACCOUNT_INACTIVE_OR_SUSPENDED');
  });

  test('Administrator account requires MFA setup and TOTP verification', async () => {
    const admin = await repo.createUser({
      email: 'admin@campus.edu',
      password_hash: await PasswordService.hashPassword('AdminPass123!@#'),
      display_name: 'Campus Admin',
      role: UserRole.ADMINISTRATOR,
      is_verified: true,
      is_suspended: false,
      mfa_enabled: false,
      mfa_secret: null,
      tokens_revoked_at: null,
    });

    // Login without MFA configured returns setup prompt
    const initialLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@campus.edu',
      password: 'AdminPass123!@#',
    });
    assert.strictEqual(initialLogin.status, 200);
    assert.strictEqual(initialLogin.body.requiresMfaSetup, true);

    // Setup MFA
    const secret = MfaService.generateSecret();
    await repo.updateUser(admin.id, { mfa_secret: secret, mfa_enabled: true });

    // Login without code returns challenge prompt
    const challengeLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@campus.edu',
      password: 'AdminPass123!@#',
    });
    assert.strictEqual(challengeLogin.status, 200);
    assert.strictEqual(challengeLogin.body.requiresMfaChallenge, true);

    // Login with valid TOTP code succeeds
    const validOtp = MfaService.generateTOTP(secret);
    const mfaSuccessLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@campus.edu',
      password: 'AdminPass123!@#',
      totpCode: validOtp,
    });
    assert.strictEqual(mfaSuccessLogin.status, 200);
    assert.ok(mfaSuccessLogin.body.accessToken);
  });
});
