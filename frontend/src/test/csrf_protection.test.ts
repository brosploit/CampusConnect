import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, setCsrfToken } from '../api/client';

describe('CSRF Protection & Token Header Enforcement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setCsrfToken(null);
  });

  it('automatically attaches X-CSRF-Token on state-changing POST requests', async () => {
    setCsrfToken('csrf-secret-token-abc-123');

    let capturedHeaders: Headers | undefined;
    (global.fetch as any) = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedHeaders = new Headers(opts.headers);
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: true }),
      });
    });

    await apiClient('/issues', {
      method: 'POST',
      body: JSON.stringify({ category: 'WIFI_DISCONNECT', description: 'Testing CSRF' }),
    });

    expect(capturedHeaders).toBeDefined();
    expect(capturedHeaders?.get('X-CSRF-Token')).toBe('csrf-secret-token-abc-123');
  });

  it('automatically attaches X-CSRF-Token on PATCH, PUT, and DELETE requests', async () => {
    setCsrfToken('csrf-token-xyz');

    const methods = ['PATCH', 'PUT', 'DELETE'];

    for (const method of methods) {
      let capturedHeaders: Headers | undefined;
      (global.fetch as any) = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        capturedHeaders = new Headers(opts.headers);
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ updated: true }),
        });
      });

      await apiClient('/admin/issues/1', { method });
      expect(capturedHeaders?.get('X-CSRF-Token')).toBe('csrf-token-xyz');
    }
  });

  it('does NOT attach X-CSRF-Token on safe read-only GET requests', async () => {
    setCsrfToken('csrf-token-xyz');

    let capturedHeaders: Headers | undefined;
    (global.fetch as any) = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedHeaders = new Headers(opts.headers);
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ campuses: [] }),
      });
    });

    await apiClient('/campuses', { method: 'GET' });
    expect(capturedHeaders?.get('X-CSRF-Token')).toBeNull();
  });

  it('always includes credentials: include to send secure HttpOnly session cookies', async () => {
    let capturedOptions: RequestInit | undefined;
    (global.fetch as any) = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedOptions = opts;
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });
    });

    await apiClient('/zones');
    expect(capturedOptions?.credentials).toBe('include');
  });
});
