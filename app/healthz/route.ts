/** Liveness: the process answers. Checks no dependency (research R-008). */
import { connection } from 'next/server';

export async function GET() {
  // Answer per request, never from a prerendered copy.
  await connection();
  return Response.json({ status: 'UP' });
}
