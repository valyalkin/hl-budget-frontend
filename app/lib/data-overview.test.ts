import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { loadOverview } from '@/app/lib/data';
import { server } from '@/mocks/server';
import {
  incomePage,
  incomes,
  monthlyTotals,
  spendingPage,
  spendings,
} from '@/mocks/fixtures';

vi.mock('@/app/lib/auth', () => ({
  getAccessToken: vi.fn(async () => 'test-token'),
}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const API = 'http://api.test/api/v1';

/** Records every API request path + query the loader makes. */
function record(): string[] {
  const calls: string[] = [];
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url);
    calls.push(
      `${request.method} ${url.pathname.replace('/api/v1', '')}${url.search}`,
    );
  });
  return calls;
}

function earliest(spendingYear: string | null, incomeYear: string | null) {
  server.use(
    http.put(`${API}/users/me`, () =>
      HttpResponse.json({
        id: '0b9f6c1e-3c1a-4f2e-9a57-2f1d6c2b8e11',
        displayName: 'Alex Example',
        email: 'alex@example.com',
      }),
    ),
    http.get(`${API}/spendings`, () =>
      HttpResponse.json({
        ...spendingPage(),
        items: spendingYear
          ? [{ ...spendings[0], date: `${spendingYear}-03-09` }]
          : [],
      }),
    ),
    http.get(`${API}/incomes`, () =>
      HttpResponse.json({
        ...incomePage(),
        items: incomeYear
          ? [{ ...incomes[0], date: `${incomeYear}-05-01` }]
          : [],
      }),
    ),
  );
}

describe('loadOverview (specs/011 contracts §1)', () => {
  it('loads the current year from the existing endpoints in two rounds', async () => {
    earliest('2025', '2024');
    const calls = record();
    const data = await loadOverview({ month: '2026-03' });
    server.events.removeAllListeners();

    expect(data.year).toBe(2026);
    expect(data.minYear).toBe(2024);
    expect(data.month).toBe('2026-03');
    // Fixtures: spendings 2741.10 (Sep) + 2234.37 (Oct); income 5120.25 (Oct).
    expect(data.totals).toEqual({
      earnedCents: 512025,
      spentCents: 497547,
      savedCents: 14478,
    });
    expect(calls).toEqual(
      expect.arrayContaining([
        'PUT /users/me',
        'GET /monthly-totals?year=2026',
        'GET /monthly-income-totals?year=2026',
        'GET /spendings?sort=date,asc&size=1&page=0',
        'GET /incomes?sort=date,asc&size=1&page=0',
        'GET /category-totals?from=2026-01-01&to=2026-12-31',
        'GET /account-totals?from=2026-01-01&to=2026-12-31',
      ]),
    );
    expect(calls).toHaveLength(7);
  });

  it('clamps a future year and fetches that year’s monthly totals again', async () => {
    earliest('2025', null);
    const calls = record();
    const data = await loadOverview({ year: '2031' });
    server.events.removeAllListeners();
    expect(data.year).toBe(2026);
    expect(calls).toContain('GET /monthly-totals?year=2031');
    expect(calls).toContain('GET /monthly-totals?year=2026');
    expect(calls).toContain(
      'GET /category-totals?from=2026-01-01&to=2026-12-31',
    );
  });

  it('shows only the current year when nothing is recorded', async () => {
    earliest(null, null);
    const data = await loadOverview({ year: '2020' });
    expect(data.year).toBe(2026);
    expect(data.minYear).toBe(2026);
  });

  it('loads a past year in full', async () => {
    earliest('2024', null);
    server.use(
      http.get(`${API}/monthly-totals`, () =>
        HttpResponse.json(monthlyTotals(2025)),
      ),
    );
    const data = await loadOverview({ year: '2025', month: 'junk' });
    expect(data.year).toBe(2025);
    expect(data.monthsElapsed).toBe(12);
    expect(data.month).toBeNull();
  });
});
