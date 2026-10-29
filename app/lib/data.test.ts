import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { UnauthenticatedError } from '@/app/lib/definitions';
import {
  ensureMyProfile,
  getAccounts,
  getCategories,
  getMonthlyTotals,
  getMonthSpendings,
  loadSpendingsPage,
} from '@/app/lib/data';
import {
  ids,
  monthlyTotals,
  spendingPage,
  spendings,
  TODAY,
} from '@/mocks/fixtures';

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
    expect(redirect).toHaveBeenCalledWith('/auth/login?returnTo=/spendings');
  });

  it('sends the user to sign in again when there is no usable token', async () => {
    getAccessToken.mockRejectedValueOnce(new UnauthenticatedError());
    await expect(ensureMyProfile()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/auth/login?returnTo=/spendings');
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

describe('spending screen reads (feature 003)', () => {
  const API = 'http://api.test/api/v1';

  it('asks for a year only when given one', async () => {
    const seen: string[] = [];
    server.use(
      http.get(`${API}/monthly-totals`, ({ request }) => {
        seen.push(new globalThis.URL(request.url).search);
        return HttpResponse.json(monthlyTotals());
      }),
    );
    await getMonthlyTotals();
    await getMonthlyTotals(2025);
    expect(seen).toEqual(['', '?year=2025']);
  });

  it('reads every page of a month, newest first, in order', async () => {
    const urls: globalThis.URL[] = [];
    server.use(
      http.get(`${API}/spendings`, ({ request }) => {
        const url = new globalThis.URL(request.url);
        urls.push(url);
        const page = Number(url.searchParams.get('page'));
        return HttpResponse.json(
          spendingPage([spendings[page % 2] ?? spendings[0]!], page, 3),
        );
      }),
    );
    const items = await getMonthSpendings({ year: 2026, month: 2 });
    expect(items).toHaveLength(3);
    expect(urls.map((u) => u.searchParams.get('page'))).toEqual([
      '0',
      '1',
      '2',
    ]);
    expect(urls[0]?.searchParams.get('from')).toBe('2026-02-01');
    expect(urls[0]?.searchParams.get('to')).toBe('2026-02-28');
    expect(urls[0]?.searchParams.get('size')).toBe('100');
    expect(urls[0]?.searchParams.get('sort')).toBe('date,desc');
  });

  it('maps categories and accounts to name and count', async () => {
    await expect(getCategories()).resolves.toContainEqual({
      id: ids.coffee,
      name: 'Coffee',
      count: 3,
      isDefault: false,
    });
    await expect(getAccounts()).resolves.toContainEqual({
      id: ids.visa,
      name: 'Visa',
      count: 12,
    });
  });

  it('loads a past month with one totals call', async () => {
    let totalsCalls = 0;
    server.use(
      http.put(URL, () => HttpResponse.json(profile)),
      http.get(`${API}/monthly-totals`, ({ request }) => {
        totalsCalls += 1;
        return HttpResponse.json(
          monthlyTotals(
            Number(
              new globalThis.URL(request.url).searchParams.get('year') ?? 2026,
            ),
          ),
        );
      }),
    );
    const data = await loadSpendingsPage('2026-09');
    expect(totalsCalls).toBe(1);
    expect(data.ym).toEqual({ year: 2026, month: 9 });
    expect(data.today).toBe(TODAY);
    expect(data.categoryTotals.items).toHaveLength(2);
    expect(data.merchants.items[0]?.name).toBe('Neighbourhood Market');
  });

  it('clamps a future month to today’s, with one more totals call for the other year', async () => {
    const years: (string | null)[] = [];
    server.use(
      http.put(URL, () => HttpResponse.json(profile)),
      http.get(`${API}/monthly-totals`, ({ request }) => {
        const year = new globalThis.URL(request.url).searchParams.get('year');
        years.push(year);
        return HttpResponse.json(monthlyTotals(year ? Number(year) : 2026));
      }),
    );
    const data = await loadSpendingsPage('2031-01');
    expect(years).toEqual(['2031', '2026']);
    expect(data.ym).toEqual({ year: 2026, month: 10 });
    expect(data.totals.year).toBe(2026);
  });

  it('falls back to the current month without a param', async () => {
    server.use(http.put(URL, () => HttpResponse.json(profile)));
    const data = await loadSpendingsPage(undefined);
    expect(data.ym).toEqual({ year: 2026, month: 10 });
  });
});
