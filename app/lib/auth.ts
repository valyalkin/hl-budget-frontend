import 'server-only';

import { auth0 } from '@/app/lib/auth0';
import { UnauthenticatedError } from '@/app/lib/definitions';

/** The current session, or null. Never pass it to a client component. */
export async function getSession() {
  return auth0.getSession();
}

/**
 * The caller's access token for the API. A missing session or a refresh that fails means the
 * user has to sign in again, so both surface as UnauthenticatedError.
 */
export async function getAccessToken(): Promise<string> {
  try {
    const { token } = await auth0.getAccessToken();
    return token;
  } catch {
    throw new UnauthenticatedError();
  }
}
