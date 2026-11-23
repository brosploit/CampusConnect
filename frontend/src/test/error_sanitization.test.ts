import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../api/client';

describe('Error Sanitization & Internal Leakage Prevention', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('replaces raw database SQL errors with safe generic message on 500 responses', async () => {
    (global.fetch as any) = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            error: {
              code: 'DATABASE_ERROR',
              message: 'pg: syntax error at or near "SELECT" in /app/dist/database/pgRepository.js:142:12',
              requestId: 'req-err-999',
            },
          }),
      });
    });

    await expect(apiClient('/zones')).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'A secure server error occurred. Our team has been notified. Please try again later.',
      status: 500,
      requestId: 'req-err-999',
    });
  });

  it('redacts raw server stack traces in error messages', async () => {
    (global.fetch as any) = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            error: {
              code: 'BAD_REQUEST',
              message: 'Unhandled Exception at Object.<anonymous> (/var/task/app.js:23:14)',
            },
          }),
      });
    });

    await expect(apiClient('/readings')).rejects.toMatchObject({
      message: 'An error occurred while processing your request. Please check your inputs.',
      status: 400,
    });
  });
});
