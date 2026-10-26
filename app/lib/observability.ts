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
