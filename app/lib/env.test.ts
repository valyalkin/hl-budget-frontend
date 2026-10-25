import { describe, expect, it } from 'vitest';
import { loadEnv } from '@/app/lib/env';

const valid = {
  APP_BASE_URL: 'http://localhost:3000',
  API_BASE_URL: 'http://localhost:8080',
  AUTH0_DOMAIN: 'tenant.eu.auth0.com',
  AUTH0_CLIENT_ID: 'client',
  AUTH0_CLIENT_SECRET: 'super-secret-value',
  AUTH0_SECRET: 'another-secret-value',
  AUTH0_AUDIENCE: 'https://api.hl-budget.example',
};

describe('loadEnv', () => {
  it('parses a valid environment and defaults the API timeout', () => {
    expect(loadEnv(valid)).toMatchObject({ API_TIMEOUT_MS: 5000 });
    expect(loadEnv({ ...valid, API_TIMEOUT_MS: '1500' }).API_TIMEOUT_MS).toBe(
      1500,
    );
  });

  it.each(Object.keys(valid))('names %s when it is missing', (name) => {
    const source: Record<string, string | undefined> = { ...valid };
    delete source[name];
    expect(() => loadEnv(source)).toThrow(name);
  });

  it('names every invalid variable at once', () => {
    expect(() =>
      loadEnv({ ...valid, API_BASE_URL: 'not a url', AUTH0_DOMAIN: '' }),
    ).toThrow(/API_BASE_URL.*AUTH0_DOMAIN|AUTH0_DOMAIN.*API_BASE_URL/);
  });

  it('never prints a value', () => {
    let message = '';
    try {
      loadEnv({
        ...valid,
        APP_BASE_URL: 'super-secret-value',
        AUTH0_SECRET: undefined,
      });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('APP_BASE_URL');
    expect(message).not.toContain('super-secret-value');
    expect(message).not.toContain('another-secret-value');
  });
});
