/**
 * Readiness: the web app has no required dependency. It can render the landing page and the
 * "something went wrong" state without the API, so an API outage must not take it out of
 * rotation too (research R-008).
 */
import { connection } from 'next/server';

export async function GET() {
  // Answer per request, never from a prerendered copy.
  await connection();
  return Response.json({ status: 'UP' });
}
