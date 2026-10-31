import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { getEarliestSpendingYear } from '@/app/lib/data';
import { server } from '@/mocks/server';
import { spendingPage, spendings } from '@/mocks/fixtures';

vi.mock('@/app/lib/auth', () => ({
  getAccessToken: vi.fn(async () => 'test-token'),
}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

describe('getEarliestSpendingYear (specs/006-mobile-view R-004)', () => {
  it('asks for the oldest spending and returns its year', async () => {
    let query = '';
    server.use(
      http.get('http://api.test/api/v1/spendings', ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json({
          ...spendingPage(),
          items: [{ ...spendings[0], date: '2024-03-09' }],
        });
      }),
    );
    await expect(getEarliestSpendingYear()).resolves.toBe(2024);
    expect(query).toBe('?sort=date,asc&size=1&page=0');
  });

  it('is null when there are no spendings', async () => {
    server.use(
      http.get('http://api.test/api/v1/spendings', () =>
        HttpResponse.json({ ...spendingPage(), items: [] }),
      ),
    );
    await expect(getEarliestSpendingYear()).resolves.toBeNull();
  });
});
