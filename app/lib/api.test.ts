import { http, HttpResponse, delay } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { apiFetch, authedFetch } from '@/app/lib/api';
import {
  ApiError,
  ApiUnavailableError,
  UnauthenticatedError,
} from '@/app/lib/definitions';

const { getAccessToken } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async () => 'test-token'),
}));
vi.mock('@/app/lib/auth', () => ({ getAccessToken }));

const URL = 'http://api.test/api/v1/users/me';

describe('apiFetch', () => {
  beforeEach(() => {
    getAccessToken.mockResolvedValue('test-token');
  });

  it('returns the JSON body of a 2xx', async () => {
    server.use(http.put(URL, () => HttpResponse.json({ id: 'u1' })));
    await expect(
      apiFetch(`/api/v1/users/me`, { method: 'PUT' }),
    ).resolves.toEqual({
      id: 'u1',
    });
  });

  it('turns a 401 into UnauthenticatedError', async () => {
    server.use(
      http.put(URL, () =>
        HttpResponse.json({ traceId: 't-401' }, { status: 401 }),
      ),
    );
    const error = await apiFetch('/api/v1/users/me', { method: 'PUT' }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(UnauthenticatedError);
    expect((error as UnauthenticatedError).traceId).toBe('t-401');
  });

  it('turns a 500 problem into ApiError with type and traceId', async () => {
    server.use(
      http.put(URL, () =>
        HttpResponse.json(
          { type: 'urn:problem:hl-budget:internal-error', traceId: 'abc123' },
          { status: 500 },
        ),
      ),
    );
    const error = await apiFetch('/api/v1/users/me', { method: 'PUT' }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 500,
      type: 'urn:problem:hl-budget:internal-error',
      traceId: 'abc123',
    });
  });

  it('falls back to the X-Request-Id header when the body is not JSON', async () => {
    server.use(
      http.put(
        URL,
        () =>
          new HttpResponse('oops', {
            status: 502,
            headers: { 'X-Request-Id': 'hdr-1' },
          }),
      ),
    );
    await expect(
      apiFetch('/api/v1/users/me', { method: 'PUT' }),
    ).rejects.toMatchObject({ status: 502, traceId: 'hdr-1' });
  });

  it('turns a timeout into ApiUnavailableError', async () => {
    server.use(
      http.put(URL, async () => {
        await delay(1000);
        return HttpResponse.json({});
      }),
    );
    await expect(
      apiFetch('/api/v1/users/me', { method: 'PUT' }),
    ).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it('turns a network failure into ApiUnavailableError', async () => {
    server.use(http.put(URL, () => HttpResponse.error()));
    await expect(
      apiFetch('/api/v1/users/me', { method: 'PUT' }),
    ).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it('returns undefined for a 204', async () => {
    server.use(http.put(URL, () => new HttpResponse(null, { status: 204 })));
    await expect(
      apiFetch('/api/v1/users/me', { method: 'PUT' }),
    ).resolves.toBeUndefined();
  });

  it('refuses a path outside /api/v1/', async () => {
    await expect(apiFetch('/healthz' as `/api/v1/${string}`)).rejects.toThrow(
      '/api/v1/',
    );
  });
});

describe('authedFetch', () => {
  it('sends the access token as a bearer header', async () => {
    let seen: string | null = null;
    server.use(
      http.put(URL, ({ request }) => {
        seen = request.headers.get('authorization');
        return HttpResponse.json({});
      }),
    );
    await authedFetch('/api/v1/users/me', { method: 'PUT' });
    expect(seen).toBe('Bearer test-token');
  });

  it('propagates UnauthenticatedError when there is no usable token', async () => {
    getAccessToken.mockRejectedValueOnce(new UnauthenticatedError());
    await expect(
      authedFetch('/api/v1/users/me', { method: 'PUT' }),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
