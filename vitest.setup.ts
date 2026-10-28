import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';

// Every variable app/lib/env.ts requires, so server modules load in tests.
process.env.APP_BASE_URL = 'http://app.test';
process.env.API_BASE_URL = 'http://api.test';
process.env.API_TIMEOUT_MS = '200';
process.env.AUTH0_DOMAIN = 'tenant.test';
process.env.AUTH0_CLIENT_ID = 'client-id';
process.env.AUTH0_CLIENT_SECRET = 'client-secret';
process.env.AUTH0_SECRET = 'a'.repeat(64);
process.env.AUTH0_AUDIENCE = 'https://api.test';

beforeAll(() => {
  // A request without a handler is a test reaching the real network (msw 3 option name).
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// jsdom has <dialog> but not its modal methods; enough of them for the Settings tests.
if (
  typeof HTMLDialogElement !== 'undefined' &&
  !HTMLDialogElement.prototype.showModal
) {
  HTMLDialogElement.prototype.showModal = function showModal(
    this: HTMLDialogElement,
  ) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
