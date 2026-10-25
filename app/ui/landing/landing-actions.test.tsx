import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import LandingActions from '@/app/ui/landing/landing-actions';

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn<() => Promise<unknown>>(),
}));
vi.mock('@/app/lib/auth', () => ({ getSession }));

it('offers Sign in as a plain link without a session', async () => {
  getSession.mockResolvedValue(null);
  render(await LandingActions());
  const link = screen.getByRole('link', { name: 'Sign in' });
  expect(link).toHaveAttribute('href', '/auth/login');
  expect(screen.queryByText('Go to HL Budget')).not.toBeInTheDocument();
});

it('offers Go to HL Budget with a session', async () => {
  getSession.mockResolvedValue({ user: { sub: 'auth0|x' } });
  render(await LandingActions());
  expect(screen.getByRole('link', { name: 'Go to HL Budget' })).toHaveAttribute(
    'href',
    '/home',
  );
  expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
});
