import type { ProfileNames } from '@/app/lib/definitions';

/** "Hello, {name}", else "Hello, {email}", else "Hello" (data-model.md "UI fallbacks"). */
export function greeting({ displayName, email }: ProfileNames): string {
  const who = displayName ?? email;
  return who ? `Hello, ${who}` : 'Hello';
}

/**
 * Up to two letters for the avatar placeholder: first and last word of the name, else the first
 * letter of the email. Null means "show a neutral icon".
 */
export function initials({ displayName, email }: ProfileNames): string | null {
  const words = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length > 0) {
    const first = words[0]?.[0] ?? '';
    const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
    return `${first}${last}`.toUpperCase();
  }
  const letter = email?.trim()[0];
  return letter ? letter.toUpperCase() : null;
}
