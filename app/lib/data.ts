import 'server-only';

import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { authedFetch } from '@/app/lib/api';
import { UnauthenticatedError, type UserProfile } from '@/app/lib/definitions';

/**
 * Creates or refreshes the caller's record and returns it (PUT /api/v1/users/me). 200 and 201
 * are the same to the UI. Per-user and idempotent, so never cached and safe to call per render.
 *
 * A rejected or unusable token sends the user to sign in again (FR-010); any other failure
 * propagates to the segment's error boundary (FR-021).
 */
export async function ensureMyProfile(): Promise<UserProfile> {
  try {
    return await authedFetch<UserProfile>('/api/v1/users/me', {
      method: 'PUT',
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect('/auth/login?returnTo=/home' as Route);
    }
    throw error;
  }
}
