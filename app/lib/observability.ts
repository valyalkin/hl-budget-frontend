import 'server-only';

export type ErrorReport = {
  level: 'error';
  message: string;
  digest?: string;
  path?: string;
  method?: string;
  routePath?: string;
};

/**
 * Builds the report field by field. `request.headers` carries the session cookie and any bearer
 * token, so the request is never spread or copied into a log line.
 */
export function toErrorReport(
  error: unknown,
  request: { path?: string; method?: string },
  context: { routePath?: string },
): ErrorReport {
  return {
    level: 'error',
    message: error instanceof Error ? error.message : String(error),
    digest:
      typeof error === 'object' && error !== null && 'digest' in error
        ? String((error as { digest: unknown }).digest)
        : undefined,
    path: request.path,
    method: request.method,
    routePath: context.routePath,
  };
}

/** One JSON line to stdout per server error. The single place a vendor SDK would plug in. */
export function reportError(report: ErrorReport): void {
  process.stdout.write(`${JSON.stringify(report)}\n`);
}

export type SignInFailureReport = {
  level: 'warn';
  event: 'signin_failed';
  code?: string;
  message: string;
  causeCode?: string;
  causeMessage?: string;
};

function field(value: unknown, key: 'code' | 'message'): string | undefined {
  if (typeof value !== 'object' || value === null || !(key in value)) {
    return undefined;
  }
  const found = (value as Record<string, unknown>)[key];
  return typeof found === 'string' ? found : undefined;
}

/**
 * Why Auth0 sent the user back without a session: the SDK's error code and message, plus the
 * tenant's own code and description from `cause` (e.g. `access_denied`, "Client … is not
 * authorized to access resource server"). Only these named fields are read, never the request.
 * A warning, not an error: a user cancelling the login page lands here too.
 */
export function toSignInFailureReport(error: unknown): SignInFailureReport {
  const cause =
    typeof error === 'object' && error !== null && 'cause' in error
      ? (error as { cause: unknown }).cause
      : undefined;
  return {
    level: 'warn',
    event: 'signin_failed',
    code: field(error, 'code'),
    message: field(error, 'message') ?? String(error),
    causeCode: field(cause, 'code'),
    causeMessage: field(cause, 'message'),
  };
}

/** One JSON line to stdout per failed sign-in. */
export function reportSignInFailure(report: SignInFailureReport): void {
  process.stdout.write(`${JSON.stringify(report)}\n`);
}
