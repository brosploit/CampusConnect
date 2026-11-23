import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Polyfill global fetch if not present in jsdom
if (!global.fetch) {
  global.fetch = vi.fn();
}

// Polyfill window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

