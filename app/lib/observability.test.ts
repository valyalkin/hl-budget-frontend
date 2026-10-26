import { expect, it, vi } from 'vitest';
import { reportError, toErrorReport } from '@/app/lib/observability';

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
