import 'server-only';

import { getAccessToken } from '@/app/lib/auth';
import {
  ApiError,
  ApiUnavailableError,
  type FieldError,
  type ProblemExtras,
  UnauthenticatedError,
} from '@/app/lib/definitions';
import { env } from '@/app/lib/env';

type ApiPath = `/api/v1/${string}`;

type Problem = {
  type?: unknown;
  traceId?: unknown;
  details?: unknown;
  errors?: unknown;
};

async function readProblem(response: Response): Promise<Problem> {
  try {
    return (await response.json()) as Problem;
  } catch {
    return {};
  }
}

const asString = (value: unknown) =>
  typeof value === 'string' ? value : undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function asFieldError(value: unknown): FieldError | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const message = asString(value.message);
  const pointer = asString(value.pointer);
  const field = asString(value.field) ?? pointer?.replace(/^#\//, '');
  if (!field || !message) {
    return undefined;
  }
  return { field, pointer, code: asString(value.code), message };
}

/** The parts of a problem body the UI words messages from; anything malformed is dropped. */
function extrasOf(problem: Problem): ProblemExtras {
  const details = isRecord(problem.details) ? problem.details : undefined;
  const errors = Array.isArray(problem.errors)
    ? problem.errors.map(asFieldError).filter((e) => e !== undefined)
    : undefined;
  return { reason: asString(details?.reason), details, errors };
}

/**
 * The one fetch wrapper. Server-side only, never cached, aborted after API_TIMEOUT_MS.
 * Throws UnauthenticatedError on 401, ApiError on any other non-2xx, and ApiUnavailableError
 * when the API is slow or unreachable.
 */
export async function apiFetch<T>(
  path: ApiPath,
  init: RequestInit = {},
): Promise<T> {
  if (!path.startsWith('/api/v1/')) {
    throw new Error(`API paths must start with /api/v1/: ${path}`);
  }

  let response: Response;
  try {
    response = await fetch(`${env.API_BASE_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...init.headers },
      cache: 'no-store',
      signal: AbortSignal.timeout(env.API_TIMEOUT_MS),
    });
  } catch (error) {
    throw new ApiUnavailableError({ cause: error });
  }

  if (!response.ok) {
    const problem = await readProblem(response);
    const traceId =
      asString(problem.traceId) ??
      response.headers.get('x-request-id') ??
      undefined;
    if (response.status === 401) {
      throw new UnauthenticatedError(traceId);
    }
    throw new ApiError(
      response.status,
      asString(problem.type),
      traceId,
      extrasOf(problem),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** apiFetch as the signed-in user. Reads the session, so never call it inside 'use cache'. */
export async function authedFetch<T>(
  path: ApiPath,
  init: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken();
  return apiFetch<T>(path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
}
