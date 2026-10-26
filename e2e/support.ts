import { expect, test, type Page } from '@playwright/test';

/**
 * The dev/test tenant's seeded user. Credentials come from the environment (local .env or CI
 * secrets) and are never committed. Without them the journey specs skip.
 */
export function credentials() {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  test.skip(
    !username || !password,
    'E2E_USERNAME / E2E_PASSWORD are not set (Auth0 test tenant user)',
  );
  return { username: username ?? '', password: password ?? '' };
}

/**
 * Auth0 labels the field "Password *" (required marker), so match the start only. Not
 * /password/i: that would also match the "Show password" switch.
 */
export const PASSWORD_LABEL = /^password\b/i;

/** Completes Auth0 Universal Login (identifier + password) on the current page. */
export async function completeUniversalLogin(page: Page) {
  const { username, password } = credentials();
  await page.waitForURL(/\/u\/login|\/authorize/);
  await page.getByLabel(/email address|username/i).fill(username);
  await page.getByLabel(PASSWORD_LABEL).fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

/** From anywhere: start sign-in and land on /home signed in. */
export async function signIn(page: Page) {
  await page.goto('/auth/login');
  await completeUniversalLogin(page);
  await page.waitForURL('**/home');
  await expect(page.getByRole('heading', { name: /^Hello/ })).toBeVisible();
}
