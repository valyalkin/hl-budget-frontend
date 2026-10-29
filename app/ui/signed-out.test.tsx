import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SignedOut from '@/app/ui/signed-out';

const { getSession, redirect } = vi.hoisted(() => ({
  getSession: vi.fn(async (): Promise<object | null> => null),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('@/app/lib/auth', () => ({ getSession }));
vi.mock('next/navigation', () => ({ redirect }));

const params = (value: Record<string, string> = {}) => Promise.resolve(value);

describe('SignedOut', () => {
  it('shows the message and Sign in, and no data', async () => {
    render(await SignedOut({ searchParams: params() }));
    expect(
      screen.getByRole('heading', {
        name: 'You’re signed out'.replace('’', "'"),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Sign in to see and record your spendings.'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Sign in' })[0]).toHaveAttribute(
      'href',
      '/auth/login?returnTo=/spendings',
    );
  });

  it('keeps the failed sign-in notice', async () => {
    render(await SignedOut({ searchParams: params({ signin: 'failed' }) }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sign-in did not complete',
    );
  });

  it('sends a signed-in visitor to the Spendings screen', async () => {
    getSession.mockResolvedValueOnce({ user: {} });
    await expect(SignedOut({ searchParams: params() })).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(redirect).toHaveBeenCalledWith('/spendings');
  });
});
