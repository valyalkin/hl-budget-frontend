import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { ids, spendings, TODAY } from '@/mocks/fixtures';
import {
  createAccount,
  createCategory,
  deleteAccount,
  deleteCategory,
  deleteSpending,
  saveSpending,
  type SpendingInput,
} from '@/app/lib/actions';

const { getSession, getAccessToken, refresh } = vi.hoisted(() => ({
  getSession: vi.fn(async (): Promise<object | null> => ({ user: {} })),
  getAccessToken: vi.fn(async () => 'test-token'),
  refresh: vi.fn(),
}));
vi.mock('@/app/lib/auth', () => ({ getSession, getAccessToken }));
vi.mock('next/cache', () => ({ refresh }));

const API = 'http://api.test/api/v1';
// Any UUID; made at run time so no key-like literal sits in the source.
const KEY = crypto.randomUUID();

const input = (overrides: Partial<SpendingInput> = {}): SpendingInput => ({
  mode: 'add',
  idempotencyKey: KEY,
  today: TODAY,
  date: '2026-10-20',
  merchant: ' Riverside Café ',
  category: { name: 'Coffee' },
  categoryText: 'Coffee',
  account: { id: ids.visa },
  accountText: 'Visa',
  amount: '6,75',
  currency: 'CAD',
  ...overrides,
});

type Seen = { method: string; path: string; key: string | null; body: unknown };

function record(
  method: 'post' | 'put' | 'delete',
  path: string,
  response: () => Response,
) {
  const seen: Seen[] = [];
  server.use(
    http[method](`${API}${path}`, async ({ request }) => {
      seen.push({
        method: request.method,
        path: new URL(request.url).pathname,
        key: request.headers.get('idempotency-key'),
        body: request.method === 'DELETE' ? null : await request.json(),
      });
      return response();
    }),
  );
  return seen;
}

beforeEach(() => {
  getSession.mockResolvedValue({ user: {} });
});

describe('saveSpending', () => {
  it('adds with one POST carrying the Idempotency-Key, then refreshes and gives the month', async () => {
    const seen = record('post', '/spendings', () =>
      HttpResponse.json(
        { ...spendings[0], date: '2026-09-30' },
        { status: 201 },
      ),
    );

    const result = await saveSpending(input());

    expect(result).toEqual({ status: 'ok', month: '2026-09' });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.key).toBe(KEY);
    expect(seen[0]?.body).toEqual({
      date: '2026-10-20',
      merchant: 'Riverside Café',
      amount: { amount: '6.75', currency: 'CAD' },
      categoryName: 'Coffee',
      accountId: ids.visa,
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('edits with one PUT to the spending', async () => {
    const seen = record('put', `/spendings/${ids.spending1}`, () =>
      HttpResponse.json(spendings[0]),
    );

    const result = await saveSpending(
      input({
        mode: 'edit',
        spendingId: ids.spending1,
        idempotencyKey: undefined,
      }),
    );

    expect(result).toEqual({ status: 'ok', month: '2026-10' });
    expect(seen[0]?.method).toBe('PUT');
    expect(seen[0]?.key).toBeNull();
  });

  it('refuses an invalid draft locally, first problem first, without a call', async () => {
    const seen = record('post', '/spendings', () => HttpResponse.json({}));
    const cases: [Partial<SpendingInput>, string, string][] = [
      [{ date: '' }, 'date', 'Pick a date.'],
      [{ date: '2026-10-29' }, 'date', 'Pick a date that is today or earlier.'],
      [{ merchant: '  ' }, 'merchant', 'Add a merchant name.'],
      [{ categoryText: '' }, 'category', 'Choose or type a category.'],
      [{ accountText: '' }, 'account', 'Choose or type an account.'],
      [{ amount: '0' }, 'amount', 'Enter an amount greater than zero.'],
      [{ amount: '1.234' }, 'amount', 'Enter an amount greater than zero.'],
    ];
    for (const [overrides, field, message] of cases) {
      await expect(saveSpending(input(overrides))).resolves.toEqual({
        status: 'error',
        field,
        message,
      });
    }
    expect(seen).toHaveLength(0);
  });

  it('words a server refusal and names its field', async () => {
    record('post', '/spendings', () =>
      HttpResponse.json(
        {
          type: 'urn:problem:hl-budget:unprocessable-entity',
          errors: [
            {
              pointer: '#/date',
              field: 'date',
              code: 'NotFuture',
              message: 'x',
            },
          ],
        },
        { status: 422 },
      ),
    );
    await expect(saveSpending(input())).resolves.toEqual({
      status: 'error',
      field: 'date',
      message: 'Pick a date that is today or earlier.',
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('says an edited spending is gone on 404, and refreshes', async () => {
    record('put', `/spendings/${ids.spending1}`, () =>
      HttpResponse.json({}, { status: 404 }),
    );
    const result = await saveSpending(
      input({
        mode: 'edit',
        spendingId: ids.spending1,
        idempotencyKey: undefined,
      }),
    );
    expect(result).toMatchObject({
      status: 'error',
      gone: true,
      message: 'This item no longer exists.',
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('says the server could not be reached', async () => {
    server.use(http.post(`${API}/spendings`, () => HttpResponse.error()));
    await expect(saveSpending(input())).resolves.toMatchObject({
      status: 'error',
      message: 'Couldn’t reach the server. Your changes weren’t saved.',
    });
  });

  it('reports a lost session as signed-out', async () => {
    getSession.mockResolvedValueOnce(null);
    await expect(saveSpending(input())).resolves.toEqual({
      status: 'signed-out',
    });
    server.use(
      http.post(`${API}/spendings`, () =>
        HttpResponse.json({}, { status: 401 }),
      ),
    );
    await expect(saveSpending(input())).resolves.toEqual({
      status: 'signed-out',
    });
  });
});

describe('deleteSpending', () => {
  it('deletes with one DELETE and refreshes', async () => {
    const seen = record(
      'delete',
      `/spendings/${ids.spending1}`,
      () => new HttpResponse(null, { status: 204 }),
    );
    await expect(deleteSpending(ids.spending1)).resolves.toEqual({
      status: 'ok',
    });
    expect(seen).toHaveLength(1);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('says it is already gone on 404, and still refreshes', async () => {
    record('delete', `/spendings/${ids.spending1}`, () =>
      HttpResponse.json({}, { status: 404 }),
    );
    await expect(deleteSpending(ids.spending1)).resolves.toMatchObject({
      status: 'error',
      message: 'This item no longer exists.',
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('refuses something that is not an id without a call', async () => {
    await expect(deleteSpending('nope')).resolves.toMatchObject({
      status: 'error',
    });
  });
});

describe('categories and accounts', () => {
  it('creates a trimmed name with one POST', async () => {
    const seen = record('post', '/categories', () =>
      HttpResponse.json({ id: ids.gifts, name: 'Gifts' }, { status: 201 }),
    );
    await expect(createCategory('  Gifts ')).resolves.toEqual({ status: 'ok' });
    expect(seen[0]?.body).toEqual({ name: 'Gifts' });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('refuses an empty name with the resource’s wording', async () => {
    await expect(createCategory('  ')).resolves.toEqual({
      status: 'error',
      message: 'Type a name for the category.',
    });
    await expect(createAccount('')).resolves.toEqual({
      status: 'error',
      message: 'Type a name for the account.',
    });
  });

  it('words duplicate, in-use and last-account refusals', async () => {
    record('post', '/accounts', () =>
      HttpResponse.json(
        { details: { reason: 'duplicate-name', name: 'visa' } },
        { status: 409 },
      ),
    );
    await expect(createAccount('visa')).resolves.toMatchObject({
      message: '“visa” already exists.',
    });

    record('delete', `/categories/${ids.coffee}`, () =>
      HttpResponse.json(
        { details: { reason: 'in-use', spendingCount: 3 } },
        { status: 409 },
      ),
    );
    await expect(
      deleteCategory({ id: ids.coffee, name: 'Coffee' }),
    ).resolves.toMatchObject({
      message: 'Coffee is used by 3 spendings, so it can’t be removed.',
    });

    record('delete', `/accounts/${ids.cash}`, () =>
      HttpResponse.json(
        { details: { reason: 'last-account' } },
        { status: 422 },
      ),
    );
    await expect(
      deleteAccount({ id: ids.cash, name: 'Cash' }),
    ).resolves.toMatchObject({
      message: 'You need at least one account.',
    });
  });
});
