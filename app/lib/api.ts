import 'server-only';

import { getAccessToken } from '@/app/lib/auth';
import {
  ApiError,
  ApiUnavailableError,
  UnauthenticatedError,
} from '@/app/lib/definitions';
import { env } from '@/app/lib/env';

type ApiPath = `/api/v1/${string}`;

type Problem = { type?: unknown; traceId?: unknown };

async function readProblem(response: Response): Promise<Problem> {
  try {
    return (await response.json()) as Problem;
  } catch {
    return {};
  }
}

const asString = (value: unknown) =>
  typeof value === 'string' ? value : undefined;

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
    throw new ApiError(response.status, asString(problem.type), traceId);
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
