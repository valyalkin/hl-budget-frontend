import 'server-only';

import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { env } from '@/app/lib/env';

const DAY = 60 * 60 * 24;

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
  routes: {
    login: '/auth/login',
    callback: '/auth/callback',
    logout: '/auth/logout',
  },
  // No token ever reaches browser JavaScript (FR-007). /auth/profile is refused in proxy.ts,
  // since the SDK has no switch for it.
  enableAccessTokenEndpoint: false,
});
