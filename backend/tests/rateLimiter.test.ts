import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../src/app';
import { setRepository } from '../src/database';
import { MemoryRepository } from '../src/database/memoryDb';
import { RateLimiter } from '../src/middleware/rateLimiter';

describe('Rate Limiting & Abuse Prevention Tests', () => {
  let app: any;
  let repo: MemoryRepository;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    repo = new MemoryRepository();
    setRepository(repo);
    RateLimiter.resetStore();
    app = createApp();
  });

  test('Public endpoints return standard rate limit headers', async () => {
    const res = await request(app).get('/health');
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['x-ratelimit-limit']);
    assert.ok(res.headers['x-ratelimit-remaining']);
    assert.ok(res.headers['x-ratelimit-reset']);
  });

  test('Exceeding rate limit returns 429 and Retry-After header', async () => {
    // Custom test router with tight rate limiter of 3 requests
    const express = require('express');
    const testApp = express();
    testApp.use(
      RateLimiter.create({
        max: 3,
        windowMs: 60000,
        keyPrefix: 'test_limit',
      })
    );
    testApp.get('/test-rate', (req: any, res: any) => res.json({ ok: true }));

    // Requests 1, 2, 3 succeed
    for (let i = 0; i < 3; i++) {
      const res = await request(testApp).get('/test-rate');
      assert.strictEqual(res.status, 200);
    }

    // Request 4 must be blocked with 429
    const blocked = await request(testApp).get('/test-rate');
    assert.strictEqual(blocked.status, 429);
    assert.strictEqual(blocked.body.error.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(blocked.headers['retry-after']);
    assert.strictEqual(blocked.headers['x-ratelimit-remaining'], '0');
  });
});
