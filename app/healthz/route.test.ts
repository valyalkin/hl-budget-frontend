import { expect, it, vi } from 'vitest';
vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));

import { GET } from '@/app/healthz/route';

it('answers 200 {"status":"UP"} without calling anything', async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ status: 'UP' });
});
