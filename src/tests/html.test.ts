import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../schema/html';

describe('sanitizeHtml', () => {
  it('keeps allowed formatting', () => {
    expect(sanitizeHtml('<p>Hi <strong>there</strong></p>')).toBe(
      '<p>Hi <strong>there</strong></p>',
    );
  });
  it('removes scripts, handlers and unsafe links', () => {
    const out = sanitizeHtml(
      '<p onclick="x()">a</p><script>alert(1)</script><a href="javascript:alert(1)">l</a><img src=x onerror=y>',
    );
    expect(out).not.toMatch(/script|onclick|javascript|onerror|<img/i);
    expect(out).toContain('<p>a</p>');
  });
  it('hardens links', () => {
    expect(sanitizeHtml('<a href="https://x.org">x</a>')).toContain('rel="noopener noreferrer"');
  });
});
