/**
 * Browser-side reporting seam for errors the server never sees. Logs the message and digest
 * only; swap the body for a vendor SDK later without touching callers.
 */
export function reportClientError(
  error: Error & { digest?: string },
  boundary: string,
): void {
  console.error(
    JSON.stringify({
      level: 'error',
      source: 'client',
      boundary,
      message: error.message,
      digest: error.digest,
    }),
  );
}
