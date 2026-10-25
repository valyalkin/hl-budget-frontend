import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { UnauthenticatedError } from '@/app/lib/definitions';
import { ensureMyProfile } from '@/app/lib/data';

const { getAccessToken, redirect } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async () => 'test-token'),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('@/app/lib/auth', () => ({ getAccessToken }));
vi.mock('next/navigation', () => ({ redirect }));

const URL = 'http://api.test/api/v1/users/me';
const profile = {
  id: '0b9f6c1e-3c1a-4f2e-9a57-2f1d6c2b8e11',
  displayName: 'Alex Example',
  email: 'alex@example.com',
  avatarUrl: null,
  firstSeenAt: '2026-10-25T09:15:00Z',
  lastSeenAt: '2026-10-25T09:15:00Z',
};

describe('ensureMyProfile', () => {
  it.each([200, 201])('returns the profile on %i', async (status) => {
    server.use(http.put(URL, () => HttpResponse.json(profile, { status })));
    await expect(ensureMyProfile()).resolves.toEqual(profile);
  });

  it('uses PUT with the bearer token', async () => {
    let seen: { method: string; auth: string | null } | undefined;
    server.use(
      http.put(URL, ({ request }) => {
        seen = {
          method: request.method,
          auth: request.headers.get('authorization'),
        };
        return HttpResponse.json(profile);
      }),
    );
    await ensureMyProfile();
    expect(seen).toEqual({ method: 'PUT', auth: 'Bearer test-token' });
  });
});

describe('ensureMyProfile failures (US4)', () => {
  it('sends the user to sign in again when the API answers 401', async () => {
    server.use(http.put(URL, () => new HttpResponse(null, { status: 401 })));
    await expect(ensureMyProfile()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/auth/login?returnTo=/home');
  });

  it('sends the user to sign in again when there is no usable token', async () => {
    getAccessToken.mockRejectedValueOnce(new UnauthenticatedError());
    await expect(ensureMyProfile()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/auth/login?returnTo=/home');
  });

  it('throws on a 500 problem, for the error boundary', async () => {
    server.use(
      http.put(URL, () =>
        HttpResponse.json({ traceId: 't1' }, { status: 500 }),
      ),
    );
    await expect(ensureMyProfile()).rejects.toMatchObject({ status: 500 });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('throws on a timeout', async () => {
    server.use(
      http.put(URL, async () => {
        await delay(1000);
        return HttpResponse.json(profile);
      }),
    );
    await expect(ensureMyProfile()).rejects.toThrow('unavailable');
  });

  it('throws when the connection is refused', async () => {
    server.use(http.put(URL, () => HttpResponse.error()));
    await expect(ensureMyProfile()).rejects.toThrow('unavailable');
  });
});
