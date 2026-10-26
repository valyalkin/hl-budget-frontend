import type { components } from '@/app/lib/api-schema';

/** A non-2xx answer from the API, carrying the problem's `type` URN and `traceId`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly type?: string,
    readonly traceId?: string,
  ) {
    super(`API request failed with ${status}`);
    this.name = 'ApiError';
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
