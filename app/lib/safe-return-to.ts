export const DEFAULT_RETURN_TO = '/spendings';

/**
 * Where to send a user after sign-in: the requested page only if it is a path on this origin,
 * otherwise /spendings. Blocks open redirects such as `https://evil`, `//evil`, `/\evil` and
 * `javascript:` (FR-003, US2-AS4).
 */
export function safeReturnTo(
  value: string | null | undefined,
  appBaseUrl: string,
): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_RETURN_TO;
  }
  if (value.includes('\\')) {
    return DEFAULT_RETURN_TO;
  }
  let resolved: URL;
  try {
    resolved = new URL(value, appBaseUrl);
  } catch {
    return DEFAULT_RETURN_TO;
  }
  if (resolved.origin !== new URL(appBaseUrl).origin) {
    return DEFAULT_RETURN_TO;
  }
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
