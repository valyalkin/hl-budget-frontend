import { afterEach, describe, expect, it, vi } from 'vitest';
import { onCallback } from '@/app/lib/auth0';

describe('onCallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs why a sign-in failed', async () => {
    const write = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    await onCallback(new Error('access_denied'), { returnTo: '/home' });
    expect(JSON.parse(String(write.mock.calls[0]?.[0]))).toMatchObject({
      level: 'warn',
      event: 'signin_failed',
      message: 'access_denied',
    });
  });

  it('logs nothing for a successful sign-in', async () => {
    const write = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    await onCallback(null, { returnTo: '/home' });
    expect(write).not.toHaveBeenCalled();
  });

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
    expect(response.headers.get('location')).toBe('http://app.test/spendings');
  });
});
