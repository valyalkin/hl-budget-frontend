import { NextResponse, type NextRequest } from 'next/server';
import { auth0 } from '@/app/lib/auth0';

export const PROTECTED_PREFIXES = ['/home'];

/** SDK routes that would expose the profile or a token to browser JavaScript (FR-007). */
const REFUSED_AUTH_ROUTES = ['/auth/profile', '/auth/access-token'];

const NO_STORE = 'private, no-cache, no-store';

const isProtected = (pathname: string) =>
  PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (REFUSED_AUTH_ROUTES.includes(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  // Always run the SDK: it serves /auth/* and rolls the session cookie on every request.
  const authResponse = await auth0.middleware(request);

  if (pathname.startsWith('/auth/') || !isProtected(pathname)) {
    return authResponse;
  }

  const session = await auth0.getSession(request);
  if (!session) {
    const loginUrl = new URL('/auth/login', request.nextUrl.origin);
    loginUrl.searchParams.set('returnTo', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl, 302);
  }

  // Protected pages must never come back from a cache after sign-out (US3-AS4).
  authResponse.headers.set('Cache-Control', NO_STORE);
  return authResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|healthz|readyz).*)',
  ],
};
