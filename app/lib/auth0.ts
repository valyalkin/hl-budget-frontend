import 'server-only';

import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { NextResponse } from 'next/server';
import { env } from '@/app/lib/env';
import { safeReturnTo } from '@/app/lib/safe-return-to';

const DAY = 60 * 60 * 24;

export const SIGN_IN_FAILED_PATH = '/?signin=failed';

/**
 * After Auth0 redirects back. A cancelled, denied or failed sign-in lands on the landing page
 * with a notice (FR-006); a success goes to the requested page if it is on this origin, else
 * /home (FR-003).
 */
export async function onCallback(
  error: unknown,
  context: { returnTo?: string },
): Promise<NextResponse> {
  const target = error
    ? SIGN_IN_FAILED_PATH
    : safeReturnTo(context.returnTo, env.APP_BASE_URL);
  return NextResponse.redirect(new URL(target, env.APP_BASE_URL));
}

export const auth0 = new Auth0Client({
  domain: env.AUTH0_DOMAIN,
  clientId: env.AUTH0_CLIENT_ID,
  clientSecret: env.AUTH0_CLIENT_SECRET,
  secret: env.AUTH0_SECRET,
  appBaseUrl: env.APP_BASE_URL,
  authorizationParameters: {
    scope: 'openid profile email offline_access',
    // Makes Auth0 issue a JWT for the HL Budget API rather than an opaque token.
    audience: env.AUTH0_AUDIENCE,
  },
  // FR-008: 7 days of inactivity or 30 days in total, whichever comes first.
  session: {
    rolling: true,
    inactivityDuration: 7 * DAY,
    absoluteDuration: 30 * DAY,
  },
  // Sign-out ends the Auth0 session too, via OIDC RP-initiated logout, and returns to
  // APP_BASE_URL (which must be in the tenant's Allowed Logout URLs).
  logoutStrategy: 'oidc',
  routes: {
    login: '/auth/login',
    callback: '/auth/callback',
    logout: '/auth/logout',
  },
  // Without a returnTo (the landing page's Sign in), land on /home rather than back on /.
  signInReturnToPath: '/home',
  onCallback,
  // No token ever reaches browser JavaScript (FR-007). /auth/profile is refused in proxy.ts,
  // since the SDK has no switch for it.
  enableAccessTokenEndpoint: false,
});
