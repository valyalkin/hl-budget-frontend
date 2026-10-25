import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { middleware, getSession } = vi.hoisted(() => ({
  middleware: vi.fn(async () => NextResponse.next()),
  getSession: vi.fn<() => Promise<unknown>>(),
}));
vi.mock('@/app/lib/auth0', () => ({ auth0: { middleware, getSession } }));

import { config, proxy } from '@/proxy';

const request = (path: string) =>
  new NextRequest(new URL(path, 'http://app.test'));

describe('proxy', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(null);
  });

  it('redirects a signed-out /home?x=1 to login with returnTo and no body', async () => {
    const response = await proxy(request('/home?x=1'));

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'http://app.test/auth/login?returnTo=%2Fhome%3Fx%3D1',
    );
    expect(await response.text()).toBe('');
  });

  it('passes a signed-in /home through the SDK response, marked no-store', async () => {
    getSession.mockResolvedValue({ user: { sub: 'auth0|x' } });
    const sdkResponse = NextResponse.next();
    middleware.mockResolvedValueOnce(sdkResponse);

    const response = await proxy(request('/home'));

    expect(response).toBe(sdkResponse);
    expect(response.headers.get('cache-control')).toBe(
      'private, no-cache, no-store',
    );
  });

  it('lets / through without a session', async () => {
    const response = await proxy(request('/'));
    expect(response.status).toBe(200);
    expect(getSession).not.toHaveBeenCalled();
  });

  it('serves /auth/* from the SDK', async () => {
    const sdkResponse = NextResponse.redirect('http://tenant.test/authorize');
    middleware.mockResolvedValueOnce(sdkResponse);
    expect(await proxy(request('/auth/login'))).toBe(sdkResponse);
  });

  it.each(['/auth/profile', '/auth/access-token'])(
    'refuses %s so no profile or token reaches the browser',
    async (path) => {
      const response = await proxy(request(path));
      expect(response.status).toBe(404);
      expect(middleware).not.toHaveBeenCalled();
    },
  );

  it('does not treat /homepage as protected', async () => {
    expect((await proxy(request('/homepage'))).status).toBe(200);
  });

  it('excludes the probes and static assets from the matcher', () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`);
    expect(matcher.test('/healthz')).toBe(false);
    expect(matcher.test('/readyz')).toBe(false);
    expect(matcher.test('/_next/static/chunk.js')).toBe(false);
    expect(matcher.test('/home')).toBe(true);
  });
});
