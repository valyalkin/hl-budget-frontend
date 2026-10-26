import { describe, expect, it } from 'vitest';
import { safeReturnTo } from '@/app/lib/safe-return-to';

const base = 'https://hl-budget.example';

describe('safeReturnTo', () => {
  it.each(['/home', '/home?x=1', '/home?x=1#top'])('accepts %s', (value) => {
    expect(safeReturnTo(value, base)).toBe(value);
  });

  it.each([
    'https://example.com',
    `${base}/home`,
    '//evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    'javascript:alert(1)',
    'home',
    '',
  ])('rejects %j and falls back to /home', (value) => {
    expect(safeReturnTo(value, base)).toBe('/home');
  });

  it('falls back to /home when missing', () => {
    expect(safeReturnTo(undefined, base)).toBe('/home');
    expect(safeReturnTo(null, base)).toBe('/home');
  });

  it('normalises dot segments without leaving the origin', () => {
    expect(safeReturnTo('/a/../home', base)).toBe('/home');
  });
});
