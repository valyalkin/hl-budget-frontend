import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { ensureMyProfile } from '@/app/lib/data';

const { getAccessToken } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async () => 'test-token'),
}));
vi.mock('@/app/lib/auth', () => ({ getAccessToken }));

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
