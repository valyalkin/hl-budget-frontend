import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import SignOutLink from '@/app/ui/home/sign-out-link';

it('is a plain link to the SDK logout route', () => {
  render(<SignOutLink />);
  expect(screen.getByRole('link', { name: 'Sign out' })).toHaveAttribute(
    'href',
    '/auth/logout',
  );
});
