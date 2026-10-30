'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';
import { authedFetch } from '@/app/lib/api';
import { getSession } from '@/app/lib/auth';
import {
  ApiError,
  type Spending,
  type SpendingImport,
  type SpendingImportRequest,
  type SpendingRequest,
  UnauthenticatedError,
} from '@/app/lib/definitions';
import {
  draftProblem,
  draftProblems,
  type Field,
  FIELDS,
} from '@/app/lib/draft';
import {
  fieldFor,
  fieldMessage,
  MESSAGES,
  messageFor,
  needAttention,
} from '@/app/lib/messages';
import { monthOf, monthParam, parseAmountInput } from '@/app/lib/utils';

/**
 * Writes for the spending screens (research R-009). Each action re-checks the session, validates
 * its input, makes exactly one API call, refreshes the page on success and returns a plain result.
 * None throws to the client.
 */
export type ActionResult<T extends object = object> =
  | ({ status: 'ok' } & T)
  | { status: 'error'; message: string; field?: string; gone?: boolean }
  | { status: 'signed-out' };

const SIGNED_OUT = { status: 'signed-out' } as const;
const uuid = z.uuid();

/** Either an existing item's id (picked or typed exactly) or a new name. */
const namedRef = z.union([
  z.object({ id: z.uuid() }),
  z.object({ name: z.string().trim().min(1).max(50) }),
]);

const spendingInput = z.object({
  mode: z.enum(['add', 'edit']),
  spendingId: z.uuid().optional(),
  idempotencyKey: z.uuid().optional(),
  today: z.iso.date(),
  date: z.string(),
  merchant: z.string(),
  category: namedRef,
  categoryText: z.string(),
  account: namedRef,
  accountText: z.string(),
  amount: z.string(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export type SpendingInput = z.input<typeof spendingInput>;

async function signedIn(): Promise<boolean> {
  return (await getSession()) !== null;
}

/** Runs one API call; turns a lost session into `signed-out` and anything else into a message. */
async function attempt<T extends object>(
  call: () => Promise<ActionResult<T>>,
  context: Parameters<typeof messageFor>[1] = {},
): Promise<ActionResult<T>> {
  if (!(await signedIn())) {
    return SIGNED_OUT;
  }
  try {
    return await call();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return SIGNED_OUT;
    }
    const gone = error instanceof ApiError && error.status === 404;
    if (gone) {
      refresh();
    }
    return {
      status: 'error',
      message: messageFor(error, context),
      field: fieldFor(error),
      ...(gone ? { gone: true } : {}),
    };
  }
}

/**
 * Adds or edits a spending from the entry row. Add sends the row's Idempotency-Key, so a retried
 * or doubled save creates one spending (FR-039). Returns the saved spending's month so the row can
 * switch to it (FR-038).
 */
export async function saveSpending(
  input: SpendingInput,
): Promise<ActionResult<{ month: string }>> {
  const parsed = spendingInput.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: MESSAGES.unavailable };
  }
  const value = parsed.data;
  const problem = draftProblem(
    {
      date: value.date,
      merchant: value.merchant,
      category: value.categoryText,
      account: value.accountText,
      amount: value.amount,
    },
    value.today,
  );
  if (problem) {
    return { status: 'error', message: problem.message, field: problem.field };
  }
  if (value.mode === 'add' ? !value.idempotencyKey : !value.spendingId) {
    return { status: 'error', message: MESSAGES.unavailable };
  }

  const body: SpendingRequest = {
    date: value.date,
    merchant: value.merchant.trim(),
    amount: {
      amount: parseAmountInput(value.amount) ?? '',
      currency: value.currency,
    },
    ...('id' in value.category
      ? { categoryId: value.category.id }
      : { categoryName: value.category.name }),
    ...('id' in value.account
      ? { accountId: value.account.id }
      : { accountName: value.account.name }),
  };

  return attempt(async () => {
    const saved =
      value.mode === 'add'
        ? await authedFetch<Spending>('/api/v1/spendings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': value.idempotencyKey ?? '',
            },
            body: JSON.stringify(body),
          })
        : await authedFetch<Spending>(
            `/api/v1/spendings/${value.spendingId ?? ''}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            },
          );
    refresh();
    return { status: 'ok', month: monthParam(monthOf(saved.date)) };
  });
}

/** Deletes a spending at once, with no confirmation and no undo (FR-060). */
export async function deleteSpending(
  spendingId: string,
): Promise<ActionResult> {
  if (!uuid.safeParse(spendingId).success) {
    return { status: 'error', message: MESSAGES.unavailable };
  }
  return attempt(async () => {
    await authedFetch(`/api/v1/spendings/${spendingId}`, { method: 'DELETE' });
    refresh();
    return { status: 'ok' };
  });
}

const resources = {
  category: { path: '/api/v1/categories', empty: MESSAGES.categoryName },
  account: { path: '/api/v1/accounts', empty: MESSAGES.accountName },
} as const;

type Resource = keyof typeof resources;

async function createNamed(
  resource: Resource,
  rawName: string,
): Promise<ActionResult> {
  const name = z.string().trim().min(1).max(50).safeParse(rawName);
  if (!name.success) {
    return { status: 'error', message: resources[resource].empty };
  }
  return attempt(
    async () => {
      await authedFetch(resources[resource].path as `/api/v1/${string}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.data }),
      });
      refresh();
      return { status: 'ok' };
    },
    { resource, name: name.data },
  );
}

async function deleteNamed(
  resource: Resource,
  item: { id: string; name: string },
): Promise<ActionResult> {
  if (!uuid.safeParse(item.id).success) {
    return { status: 'error', message: MESSAGES.unavailable };
  }
  return attempt(
    async () => {
      await authedFetch(
        `${resources[resource].path}/${item.id}` as `/api/v1/${string}`,
        {
          method: 'DELETE',
        },
      );
      refresh();
      return { status: 'ok' };
    },
    { resource, name: item.name },
  );
}

/** Adds a custom category (FR-081, FR-083). */
export async function createCategory(name: string): Promise<ActionResult> {
  return createNamed('category', name);
}

/** Removes a custom category no spending uses (FR-084). */
export async function deleteCategory(item: {
  id: string;
  name: string;
}): Promise<ActionResult> {
  return deleteNamed('category', item);
}

/** Adds an account (FR-082, FR-083). */
export async function createAccount(name: string): Promise<ActionResult> {
  return createNamed('account', name);
}

/** Removes an account no spending uses, unless it is the last one (FR-084, FR-086). */
export async function deleteAccount(item: {
  id: string;
  name: string;
}): Promise<ActionResult> {
  return deleteNamed('account', item);
}

// ---------------------------------------------------------------------------------------------
// CSV import (specs/004-csv-import research R-013)

const importInput = z.object({
  rows: z
    .array(
      z.object({
        key: z.string().min(1),
        draft: z.object({
          date: z.string(),
          merchant: z.string(),
          category: z.string(),
          account: z.string(),
          amount: z.string(),
        }),
      }),
    )
    .min(1)
    .max(1000),
  idempotencyKey: z.uuid(),
  today: z.iso.date(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export type ImportInput = z.input<typeof importInput>;

/** One field of one row that needs attention; `row` is the row's position in the request. */
export type ImportRowError = { row: number; field: Field; message: string };

export type ImportResult =
  | { status: 'ok'; month: string; count: number }
  | { status: 'error'; message: string; rowErrors?: ImportRowError[] }
  | { status: 'already-imported' }
  | { status: 'signed-out' };

/** `#/spendings/3/amount/amount` → row 3, field `amount`. */
const ROW_POINTER = /^#\/spendings\/(\d+)\/(\w+)/;
const API_FIELDS: Record<string, Field> = {
  date: 'date',
  merchant: 'merchant',
  amount: 'amount',
  categoryName: 'category',
  accountName: 'account',
};

function rowErrorsOf(error: ApiError): ImportRowError[] {
  return (error.errors ?? []).flatMap((violation) => {
    const match = ROW_POINTER.exec(violation.pointer ?? '');
    const field = match ? API_FIELDS[match[2] ?? ''] : undefined;
    if (!match || !field) {
      return [];
    }
    const message = fieldMessage(field) ?? MESSAGES.unavailable;
    return [{ row: Number(match[1]), field, message }];
  });
}

function refused(rowErrors: ImportRowError[]): ImportResult {
  const rows = new Set(rowErrors.map((error) => error.row)).size;
  return { status: 'error', message: needAttention(rows), rowErrors };
}

/**
 * Adds every reviewed row as a spending in one all-or-nothing request (FR-032, FR-033). The
 * Idempotency-Key makes a doubled or retried add import once (FR-034); a key the server already
 * used for other rows means an earlier attempt was saved, so the result is `already-imported`.
 * Returns the month of the latest imported date (FR-035).
 */
export async function importSpendings(
  input: ImportInput,
): Promise<ImportResult> {
  const parsed = importInput.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: MESSAGES.unavailable };
  }
  const { rows, idempotencyKey, today, currency } = parsed.data;

  const local = rows.flatMap(({ draft }, row) => {
    const problems = draftProblems(draft, today);
    return FIELDS.flatMap((field) => {
      const message = problems[field];
      return message ? [{ row, field, message }] : [];
    });
  });
  if (local.length > 0) {
    return refused(local);
  }

  const body: SpendingImportRequest = {
    spendings: rows.map(({ draft }) => ({
      date: draft.date,
      merchant: draft.merchant.trim(),
      amount: { amount: parseAmountInput(draft.amount) ?? '', currency },
      categoryName: draft.category.trim(),
      accountName: draft.account.trim(),
    })),
  };

  if (!(await signedIn())) {
    return SIGNED_OUT;
  }
  try {
    const saved = await authedFetch<SpendingImport>(
      '/api/v1/spending-imports',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(body),
      },
    );
    refresh();
    return {
      status: 'ok',
      month: monthParam(monthOf(saved.lastDate)),
      count: saved.spendingCount,
    };
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return SIGNED_OUT;
    }
    if (
      error instanceof ApiError &&
      error.reason === 'idempotency-key-reused'
    ) {
      refresh();
      return { status: 'already-imported' };
    }
    const rowErrors = error instanceof ApiError ? rowErrorsOf(error) : [];
    if (rowErrors.length > 0) {
      return refused(rowErrors);
    }
    return { status: 'error', message: messageFor(error) };
  }
}
