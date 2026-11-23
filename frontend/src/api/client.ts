import { ApiErrorResponse } from '../types';

let inMemoryCsrfToken: string | null = null;
let onSessionExpiredCallback: (() => void) | null = null;
let isRefreshing = false;
let refreshSubscribers: ((newToken: string) => void)[] = [];

export function setCsrfToken(token: string | null) {
  inMemoryCsrfToken = token;
}

export function getCsrfToken(): string | null {
  if (inMemoryCsrfToken) return inMemoryCsrfToken;

  // Attempt to read non-HttpOnly cc_csrf_token cookie if available
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)cc_csrf_token=([^;]+)/);
    if (match && match[1]) {
      inMemoryCsrfToken = decodeURIComponent(match[1]);
      return inMemoryCsrfToken;
    }
  }
  return null;
}

export function registerSessionExpiredCallback(cb: () => void) {
  onSessionExpiredCallback = cb;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || '/api/v1';

export class ApiError extends Error {
  code: string;
  requestId?: string;
  status: number;

  constructor(message: string, code: string, status: number, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

/**
 * Strips internal details, stack traces, or raw SQL errors to prevent internal info leakage.
 */
function sanitizeErrorMessage(status: number, data?: ApiErrorResponse): { message: string; code: string; requestId?: string } {
  const code = data?.error?.code || 'UNKNOWN_ERROR';
  const rawMessage = data?.error?.message || '';
  const requestId = data?.error?.requestId;

  // If server returns an internal error, never display raw server diagnostics
  if (status >= 500) {
    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'A secure server error occurred. Our team has been notified. Please try again later.',
      requestId,
    };
  }

  // Prevent reflection of sensitive keywords
  const blockedPatterns = [/sql/i, /postgres/i, /at .*:\d+:\d+/, /syntax error/i, /exception/i];
  const containsLeak = blockedPatterns.some((pattern) => pattern.test(rawMessage));

  const safeMessage = containsLeak || !rawMessage
    ? 'An error occurred while processing your request. Please check your inputs.'
    : rawMessage;

  return { message: safeMessage, code, requestId };
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  const method = (options.method || 'GET').toUpperCase();

  // For state-changing requests, attach Anti-CSRF token
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) {
      headers.set('X-CSRF-Token', csrf);
    }
    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }
  }

  // Always include credentials so secure HttpOnly session cookies are transmitted
  const requestOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  let response: Response;
  try {
    response = await fetch(url, requestOptions);
  } catch (netErr: any) {
    throw new ApiError('Unable to connect to Campus Connect server. Please check your network connection.', 'NETWORK_ERROR', 0);
  }

  // Handle 401 Unauthorized with token refresh if not already calling refresh/login
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({}),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.csrfToken) {
            setCsrfToken(refreshData.csrfToken);
          }
          isRefreshing = false;
          refreshSubscribers.forEach((cb) => cb(refreshData.csrfToken || ''));
          refreshSubscribers = [];

          // Retry original request
          return apiClient<T>(endpoint, options);
        } else {
          isRefreshing = false;
          refreshSubscribers = [];
          setCsrfToken(null);
          if (onSessionExpiredCallback) {
            onSessionExpiredCallback();
          }
          throw new ApiError('Your session has expired. Please log in again.', 'SESSION_EXPIRED', 401);
        }
      } catch (err) {
        isRefreshing = false;
        refreshSubscribers = [];
        setCsrfToken(null);
        if (onSessionExpiredCallback) {
          onSessionExpiredCallback();
        }
        throw new ApiError('Your session has expired. Please log in again.', 'SESSION_EXPIRED', 401);
      }
    } else {
      // Queue until refresh completes
      return new Promise<T>((resolve, reject) => {
        refreshSubscribers.push(() => {
          apiClient<T>(endpoint, options).then(resolve).catch(reject);
        });
      });
    }
  }

  let data: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const sanitized = sanitizeErrorMessage(response.status, data);
    throw new ApiError(sanitized.message, sanitized.code, response.status, sanitized.requestId);
  }

  return data as T;
}
