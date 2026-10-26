import { AuthorizationError, OAuth2Error } from '@auth0/nextjs-auth0/errors';
import { describe, expect, it, vi } from 'vitest';
import {
  reportError,
  reportSignInFailure,
  toErrorReport,
  toSignInFailureReport,
} from '@/app/lib/observability';

const request = {
  path: '/home',
  method: 'GET',
  headers: {
    cookie: '__session=secret-session-value',
    authorization: 'Bearer secret-token',
  },
};

it('reports path, method, digest and message without any header', () => {
  const error = Object.assign(new Error('boom'), { digest: '1234567890' });
  const report = toErrorReport(error, request, { routePath: '/home' });

  expect(report).toMatchObject({
    level: 'error',
    message: 'boom',
    digest: '1234567890',
    path: '/home',
    method: 'GET',
  });
  const serialized = JSON.stringify(report);
  expect(serialized).not.toContain('secret-session-value');
  expect(serialized).not.toContain('secret-token');
  expect(serialized).not.toContain('cookie');
});

it('handles a non-Error throw', () => {
  expect(toErrorReport('plain', request, {}).message).toBe('plain');
  expect(toErrorReport('plain', request, {}).digest).toBeUndefined();
});

it('writes one JSON line to stdout', () => {
  const write = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation(() => true);
  reportError(toErrorReport(new Error('boom'), request, {}));
  expect(write).toHaveBeenCalledTimes(1);
  const line = String(write.mock.calls[0]?.[0]);
  expect(line.endsWith('\n')).toBe(true);
  expect(JSON.parse(line)).toMatchObject({ message: 'boom', path: '/home' });
});

describe('toSignInFailureReport', () => {
  it("names the SDK code and Auth0's own reason from the cause", () => {
    const error = new AuthorizationError({
      cause: new OAuth2Error({
        code: 'access_denied',
        message: 'Client is not authorized to access resource server',
      }),
      message: 'An error occurred during the authorization flow.',
    });

    expect(toSignInFailureReport(error)).toEqual({
      level: 'warn',
      event: 'signin_failed',
      code: 'authorization_error',
      message: 'An error occurred during the authorization flow.',
      causeCode: 'access_denied',
      causeMessage: 'Client is not authorized to access resource server',
    });
  });

  it('handles an error without a cause, and a non-Error value', () => {
    expect(toSignInFailureReport(new Error('boom'))).toMatchObject({
      message: 'boom',
      causeCode: undefined,
    });
    expect(toSignInFailureReport('nope')).toMatchObject({ message: 'nope' });
  });

  it('writes one JSON line', () => {
    const write = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    reportSignInFailure(toSignInFailureReport(new Error('boom')));
    expect(JSON.parse(String(write.mock.calls[0]?.[0]))).toMatchObject({
      event: 'signin_failed',
      message: 'boom',
    });
    write.mockRestore();
  });
});
