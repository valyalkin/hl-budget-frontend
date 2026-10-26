import { describe, expect, it } from 'vitest';
import { onCallback } from '@/app/lib/auth0';

describe('onCallback', () => {
  it('sends a failed or cancelled sign-in to the landing page with a notice', async () => {
    const response = await onCallback(new Error('access_denied'), {
      returnTo: '/home',
    });
    expect(response.headers.get('location')).toBe(
      'http://app.test/?signin=failed',
    );
  });

  it('sends a successful sign-in to the requested same-origin page', async () => {
    const response = await onCallback(null, { returnTo: '/home?x=1' });
    expect(response.headers.get('location')).toBe('http://app.test/home?x=1');
  });

  it('ignores an off-origin returnTo', async () => {
    const response = await onCallback(null, {
      returnTo: 'https://evil.example/',
    });
    expect(response.headers.get('location')).toBe('http://app.test/home');
  });
});
