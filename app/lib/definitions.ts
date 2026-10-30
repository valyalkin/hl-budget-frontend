import type { components } from '@/app/lib/api-schema';

/** One invalid field from a problem's `errors` array. */
export type FieldError = {
  /** Dotted field name, e.g. `date` or `amount.amount`. */
  field: string;
  /** JSON Pointer, e.g. `#/date`. */
  pointer?: string;
  code?: string;
  message: string;
};

/** What a problem body says beyond its status: the rule's `reason`, `details` and field `errors`. */
export type ProblemExtras = {
  reason?: string;
  details?: Readonly<Record<string, unknown>>;
  errors?: ReadonlyArray<FieldError>;
};

/**
 * A non-2xx answer from the API, carrying the problem's `type` URN and `traceId`, and what the UI
 * needs to word a message (research R-007): `reason` (from `details.reason`), `details` and
 * `errors`.
 */
export class ApiError extends Error {
  readonly reason?: string;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly errors?: ReadonlyArray<FieldError>;

  constructor(
    readonly status: number,
    readonly type?: string,
    readonly traceId?: string,
    extras: ProblemExtras = {},
  ) {
    super(`API request failed with ${status}`);
    this.name = 'ApiError';
    this.reason = extras.reason;
    this.details = extras.details;
    this.errors = extras.errors;
  }
}

/** The API rejected the token, or there is no usable session: the user must sign in again. */
export class UnauthenticatedError extends ApiError {
  constructor(traceId?: string) {
    super(401, 'urn:problem:hl-budget:unauthenticated', traceId);
    this.name = 'UnauthenticatedError';
  }
}

/** The API did not answer in time, or could not be reached at all. */
export class ApiUnavailableError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('The API is unavailable', options);
    this.name = 'ApiUnavailableError';
  }
}

type Schemas = components['schemas'];

/** The signed-in user's record, as returned by PUT /api/v1/users/me. Generated, never hand-written. */
export type UserProfile = Schemas['UserProfile'];

/** What the greeting and avatar need. */
export type ProfileNames = Pick<UserProfile, 'displayName' | 'email'>;

/** Feature 003: generated aliases for the spending screens. */
export type Money = Schemas['Money'];
export type MoneyTotal = Schemas['MoneyTotal'];
export type Ref = Schemas['Ref'];
export type Spending = Schemas['Spending'];
export type SpendingPage = Schemas['SpendingPage'];
export type SpendingRequest = Schemas['SpendingRequest'];
export type Category = Schemas['Category'];
export type CategoryList = Schemas['CategoryList'];
export type Account = Schemas['Account'];
export type AccountList = Schemas['AccountList'];
export type MonthlyTotals = Schemas['MonthlyTotals'];
export type MonthTotal = Schemas['MonthTotal'];
export type CategoryTotals = Schemas['CategoryTotals'];
export type CategoryTotal = Schemas['CategoryTotal'];
export type Merchant = Schemas['Merchant'];
export type MerchantList = Schemas['MerchantList'];

/** Feature 004: generated aliases for the CSV import. */
export type SpendingImport = Schemas['SpendingImport'];
export type SpendingImportRequest = Schemas['SpendingImportRequest'];
export type SpendingImportRow = Schemas['SpendingImportRow'];

/** A category or account as the entry row and Settings need it. */
export type NamedItem = { id: string; name: string; count: number };

/** A past merchant as the entry row needs it. */
export type MerchantOption = {
  name: string;
  count: number;
  lastCategory: Ref;
  lastAccount: Ref;
};
