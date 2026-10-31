import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.APP_BASE_URL ?? 'http://localhost:3000';
// Opt-in, for the deployed app while it serves Traefik's self-signed certificate.
const ignoreHTTPSErrors = process.env.E2E_IGNORE_HTTPS_ERRORS === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    ignoreHTTPSErrors,
  },
  projects: [
    // The desktop journeys, unchanged; the phone ones live in e2e/phone/.
    {
      name: 'chromium',
      testIgnore: /phone\//,
      use: { ...devices['Desktop Chrome'] },
    },
    // specs/006-mobile-view: a 390px iPhone (touch, mobile UA) on Chromium, so CI needs no WebKit.
    {
      name: 'phone',
      testMatch: /phone\/.*\.spec\.ts/,
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
  ],
  // Production build, so caching and streaming behave as deployed. Against an APP_BASE_URL
  // that already answers /healthz (e.g. the cluster), nothing is started locally.
  webServer: {
    command: 'pnpm build && pnpm start',
    url: `${baseURL}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    ignoreHTTPSErrors,
  },
});
