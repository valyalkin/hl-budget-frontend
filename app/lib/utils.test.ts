import { describe, expect, it } from 'vitest';
import { greeting, initials } from '@/app/lib/utils';

const full = { displayName: 'Alex Example', email: 'alex@example.com' };

describe('greeting', () => {
  it('uses the name when there is one', () => {
    expect(greeting(full)).toBe('Hello, Alex Example');
  });
  it('falls back to the email', () => {
    expect(greeting({ ...full, displayName: null })).toBe(
      'Hello, alex@example.com',
    );
  });
  it('says just Hello when there is neither', () => {
    expect(greeting({ displayName: null, email: null })).toBe('Hello');
  });
});

describe('initials', () => {
  it('takes the first and last word of the name', () => {
    expect(initials(full)).toBe('AE');
    expect(initials({ ...full, displayName: 'mary ann de la cruz' })).toBe(
      'MC',
    );
  });
  it('takes one letter for a one-word name', () => {
    expect(initials({ ...full, displayName: 'Cher' })).toBe('C');
  });
  it('falls back to the email', () => {
    expect(initials({ displayName: null, email: 'zed@example.com' })).toBe('Z');
  });
  it('is null when there is nothing to use', () => {
    expect(initials({ displayName: null, email: null })).toBeNull();
    expect(initials({ displayName: '   ', email: null })).toBeNull();
  });
});
