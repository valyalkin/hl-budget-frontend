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
  type ImportInput,
  importSpendings,
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

describe('importSpendings', () => {
  const draft = (overrides: Record<string, string> = {}) => ({
    date: '2026-10-20',
    merchant: ' Corner Bakery ',
    category: ' Groceries ',
    account: 'Visa',
    amount: '12.4',
    ...overrides,
  });
  const importInput = (overrides: Partial<ImportInput> = {}): ImportInput => ({
    rows: [
      { key: 'r1', draft: draft() },
      { key: 'r2', draft: draft({ date: '2026-09-30', amount: '61.20' }) },
    ],
    idempotencyKey: KEY,
    today: TODAY,
    currency: 'CAD',
    ...overrides,
  });
  const receipt = {
    id: '9b2f6e1a-4c3d-4e5f-8a7b-0c1d2e3f4a5b',
    spendingCount: 2,
    firstDate: '2026-09-30',
    lastDate: '2026-10-20',
    total: { amount: '73.60', currency: 'CAD' },
    createdAt: '2026-10-28T14:03:11Z',
  };
  const problem = (extras: object) =>
    HttpResponse.json(
      {
        type: 'urn:problem:hl-budget:unprocessable-entity',
        status: 422,
        traceId: 't',
        ...extras,
      },
      { status: 422 },
    );

  it('imports with one POST carrying the key, then refreshes and gives the latest month', async () => {
    const seen = record('post', '/spending-imports', () =>
      HttpResponse.json(receipt, { status: 201 }),
    );

    const result = await importSpendings(importInput());

    expect(result).toEqual({ status: 'ok', month: '2026-10', count: 2 });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.key).toBe(KEY);
    expect(seen[0]?.body).toEqual({
      spendings: [
        {
          date: '2026-10-20',
          merchant: 'Corner Bakery',
          amount: { amount: '12.40', currency: 'CAD' },
          categoryName: 'Groceries',
          accountName: 'Visa',
        },
        {
          date: '2026-09-30',
          merchant: 'Corner Bakery',
          amount: { amount: '61.20', currency: 'CAD' },
          categoryName: 'Groceries',
          accountName: 'Visa',
        },
      ],
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('refuses invalid rows locally, without a request', async () => {
    const seen = record('post', '/spending-imports', () =>
      HttpResponse.json(receipt, { status: 201 }),
    );

    const result = await importSpendings(
      importInput({
        rows: [
          { key: 'r1', draft: draft() },
          { key: 'r2', draft: draft({ category: '', amount: '0' }) },
        ],
      }),
    );

    expect(result).toEqual({
      status: 'error',
      message: '1 row needs attention',
      rowErrors: [
        { row: 1, field: 'category', message: 'Choose or type a category.' },
        {
          row: 1,
          field: 'amount',
          message: 'Enter an amount greater than zero.',
        },
      ],
    });
    expect(seen).toHaveLength(0);
  });

  it('refuses malformed input without a request', async () => {
    const seen = record('post', '/spending-imports', () =>
      HttpResponse.json(receipt, { status: 201 }),
    );
    const many = Array.from({ length: 1001 }, (_, i) => ({
      key: `r${i}`,
      draft: draft(),
    }));

    await expect(
      importSpendings(importInput({ rows: many })),
    ).resolves.toMatchObject({ status: 'error' });
    await expect(
      importSpendings(importInput({ idempotencyKey: 'not-a-uuid' })),
    ).resolves.toMatchObject({ status: 'error' });
    await expect(
      importSpendings(importInput({ rows: [] })),
    ).resolves.toMatchObject({ status: 'error' });
    expect(seen).toHaveLength(0);
  });

  it("maps the server's row pointers back to rows and fields", async () => {
    record('post', '/spending-imports', () =>
      problem({
        errors: [
          {
            pointer: '#/spendings/1/date',
            field: 'spendings[1].date',
            code: 'NotFuture',
            message: 'must be today or earlier',
          },
          {
            pointer: '#/spendings/0/amount/amount',
            field: 'spendings[0].amount.amount',
            code: 'Positive',
            message: 'must be greater than 0',
          },
          {
            pointer: '#/spendings/1/categoryName',
            field: 'spendings[1].categoryName',
            code: 'Size',
            message: 'must be at most 50 characters',
          },
          {
            pointer: '#/spendings/0/accountName',
            field: 'spendings[0].accountName',
            code: 'NotBlank',
            message: 'must not be blank',
          },
        ],
      }),
    );

    const result = await importSpendings(importInput());

    expect(result).toEqual({
      status: 'error',
      message: '2 rows need attention',
      rowErrors: [
        {
          row: 1,
          field: 'date',
          message: 'Pick a date that is today or earlier.',
        },
        {
          row: 0,
          field: 'amount',
          message: 'Enter an amount greater than zero.',
        },
        { row: 1, field: 'category', message: 'Choose or type a category.' },
        { row: 0, field: 'account', message: 'Choose or type an account.' },
      ],
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('treats a reused key as an import that was already saved', async () => {
    record('post', '/spending-imports', () =>
      problem({ details: { reason: 'idempotency-key-reused' } }),
    );

    await expect(importSpendings(importInput())).resolves.toEqual({
      status: 'already-imported',
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('says the server could not be reached, without row errors', async () => {
    server.use(
      http.post(`${API}/spending-imports`, () => HttpResponse.error()),
    );
    await expect(importSpendings(importInput())).resolves.toEqual({
      status: 'error',
      message: 'Couldn’t reach the server. Your changes weren’t saved.',
    });

    server.use(
      http.post(`${API}/spending-imports`, () =>
        HttpResponse.json({}, { status: 503 }),
      ),
    );
    await expect(importSpendings(importInput())).resolves.toEqual({
      status: 'error',
      message: 'Couldn’t reach the server. Your changes weren’t saved.',
    });
  });

  it('reports a lost session as signed-out', async () => {
    getSession.mockResolvedValueOnce(null);
    await expect(importSpendings(importInput())).resolves.toEqual({
      status: 'signed-out',
    });
    server.use(
      http.post(`${API}/spending-imports`, () =>
        HttpResponse.json({}, { status: 401 }),
      ),
    );
    await expect(importSpendings(importInput())).resolves.toEqual({
      status: 'signed-out',
    });
  });
});
