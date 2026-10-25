import 'server-only';

import { authedFetch } from '@/app/lib/api';
import type { UserProfile } from '@/app/lib/definitions';

/**
 * Creates or refreshes the caller's record and returns it (PUT /api/v1/users/me). 200 and 201
 * are the same to the UI. Per-user and idempotent, so never cached and safe to call per render.
 */
export async function ensureMyProfile(): Promise<UserProfile> {
  return authedFetch<UserProfile>('/api/v1/users/me', { method: 'PUT' });
}
