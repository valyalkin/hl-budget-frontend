import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { UnauthenticatedError } from '@/app/lib/definitions';
import {
  ensureMyProfile,
  getAccounts,
  getAccountTotals,
  getCategories,
  getMonthlyTotals,
  getMonthSpendings,
  getEarliestYear,
  getIncomeCategories,
  getSettingsData,
  loadLedgerPage,
  loadSpendingsPage,
} from '@/app/lib/data';
import {
  accountTotals,
  categoryTotals,
  ids,
  incomeIds,
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
      incomeCount: 0,
    });
  });

  it('reads account totals for the whole month (specs/008)', async () => {
    const urls: URL[] = [];
    server.use(
      http.get(`${API}/account-totals`, ({ request }) => {
        urls.push(new globalThis.URL(request.url));
        return HttpResponse.json({
          from: '2026-02-01',
          to: '2026-02-28',
          total: { amount: '0.00', currency: 'CAD' },
          spendingCount: 0,
          items: [],
        });
      }),
    );
    const totals = await getAccountTotals({ year: 2026, month: 2 });
    expect(totals.items).toEqual([]);
    expect(urls[0]?.pathname).toBe('/api/v1/account-totals');
    expect(urls[0]?.searchParams.get('from')).toBe('2026-02-01');
    expect(urls[0]?.searchParams.get('to')).toBe('2026-02-28');
  });

  it('fetches account totals alongside category totals for the same month', async () => {
    const seen: string[] = [];
    let categoryDone = false;
    let accountStartedBeforeCategoryDone = false;
    server.use(
      http.put(URL, () => HttpResponse.json(profile)),
      http.get(`${API}/category-totals`, async ({ request }) => {
        seen.push(new globalThis.URL(request.url).search);
        await delay(30);
        categoryDone = true;
        return HttpResponse.json(categoryTotals);
      }),
      http.get(`${API}/account-totals`, ({ request }) => {
        seen.push(new globalThis.URL(request.url).search);
        accountStartedBeforeCategoryDone = !categoryDone;
        return HttpResponse.json(accountTotals);
      }),
    );
    const data = await loadSpendingsPage('2026-09');
    expect(seen).toEqual([
      '?from=2026-09-01&to=2026-09-30',
      '?from=2026-09-01&to=2026-09-30',
    ]);
    expect(accountStartedBeforeCategoryDone).toBe(true);
    expect(data.accountTotals.total.amount).toBe('2234.37');
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
    expect(data.accountTotals.items.map((i) => i.account.name)).toEqual([
      'Visa',
      'Cash',
    ]);
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

describe('income reads (specs/009)', () => {
  const API = 'http://api.test/api/v1';

  it('loads the Income page from the income endpoints, mapped to the shared shapes', async () => {
    const paths: string[] = [];
    server.use(
      http.put(URL, () => HttpResponse.json(profile)),
      http.get(`${API}/*`, ({ request }) => {
        paths.push(new globalThis.URL(request.url).pathname);
        return undefined;
      }),
    );

    const data = await loadLedgerPage('income', '2026-10');

    expect(paths).toEqual(
      expect.arrayContaining([
        '/api/v1/monthly-income-totals',
        '/api/v1/incomes',
        '/api/v1/income-category-totals',
        '/api/v1/income-account-totals',
        '/api/v1/income-categories',
        '/api/v1/accounts',
        '/api/v1/income-sources',
      ]),
    );
    expect(paths).not.toContain('/api/v1/spendings');
    expect(paths).not.toContain('/api/v1/categories');
    // An income's source is shown where a spending's merchant is.
    expect(data.spendings.map((s) => s.merchant)).toEqual([
      'Wealthsimple',
      'Acme Corp',
    ]);
    expect(data.totals.months[9]).toMatchObject({ spendingCount: 2 });
    expect(data.categoryTotals.spendingCount).toBe(2);
    expect(data.categoryTotals.items[0]).toMatchObject({
      color: '#1e5b45',
      spendingCount: 1,
    });
    expect(data.accountTotals.items[0]?.spendingCount).toBe(2);
    expect(data.categories.map((c) => c.name)).toEqual([
      'Freelance',
      'Investments',
      'Salary',
    ]);
    expect(data.merchants.items[0]).toMatchObject({
      name: 'Acme Corp',
      spendingCount: 10,
    });
    // Accounts are ranked by their income use on the Income page.
    expect(data.accounts[0]).toEqual({ id: ids.visa, name: 'Visa', count: 0 });
  });

  it('keeps the Spendings page on the spending endpoints', async () => {
    const paths: string[] = [];
    server.use(
      http.put(URL, () => HttpResponse.json(profile)),
      http.get(`${API}/*`, ({ request }) => {
        paths.push(new globalThis.URL(request.url).pathname);
        return undefined;
      }),
    );

    await loadSpendingsPage('2026-10');

    expect(paths.some((p) => p.includes('income'))).toBe(false);
  });

  it('reads income categories with counts and colours, and all of Settings at once', async () => {
    await expect(getIncomeCategories()).resolves.toContainEqual({
      id: incomeIds.salary,
      name: 'Salary',
      count: 1,
      isDefault: true,
      color: '#1e5b45',
    });
    const settings = await getSettingsData();
    expect(settings.categories.length).toBeGreaterThan(0);
    expect(settings.incomeCategories).toHaveLength(3);
    expect(settings.accounts[0]).toMatchObject({ incomeCount: 0 });
  });

  it('finds the earliest year of income from the incomes resource', async () => {
    let seen = '';
    server.use(
      http.get(`${API}/incomes`, ({ request }) => {
        seen = new globalThis.URL(request.url).search;
        return HttpResponse.json({
          items: [{ date: '2024-03-01' }],
          page: 0,
          size: 1,
          totalItems: 1,
          totalPages: 1,
        });
      }),
    );
    await expect(getEarliestYear('income')).resolves.toBe(2024);
    expect(seen).toBe('?sort=date,asc&size=1&page=0');
  });
});
