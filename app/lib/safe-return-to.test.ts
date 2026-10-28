import { describe, expect, it } from 'vitest';
import { safeReturnTo } from '@/app/lib/safe-return-to';

const base = 'https://hl-budget.example';

describe('safeReturnTo', () => {
  it.each(['/spendings', '/spendings?x=1', '/spendings?x=1#top'])(
    'accepts %s',
    (value) => {
      expect(safeReturnTo(value, base)).toBe(value);
    },
  );

  it.each([
    'https://example.com',
    `${base}/spendings`,
    '//evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    'javascript:alert(1)',
    'home',
    '',
  ])('rejects %j and falls back to /spendings', (value) => {
    expect(safeReturnTo(value, base)).toBe('/spendings');
  });

  it('falls back to /spendings when missing', () => {
    expect(safeReturnTo(undefined, base)).toBe('/spendings');
    expect(safeReturnTo(null, base)).toBe('/spendings');
  });

  it('normalises dot segments without leaving the origin', () => {
    expect(safeReturnTo('/a/../spendings', base)).toBe('/spendings');
  });
});
