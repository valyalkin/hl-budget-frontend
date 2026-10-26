import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import SignInNotice, {
  SignInNoticeSection,
} from '@/app/ui/landing/sign-in-notice';

it('is a polite live status with the notice text', () => {
  render(<SignInNotice />);
  const notice = screen.getByRole('status');
  expect(notice).toHaveAttribute('aria-live', 'polite');
  expect(notice).toHaveTextContent(
    'Sign-in did not complete. You can try again.',
  );
});

it('renders only for ?signin=failed', async () => {
  const { rerender } = render(
    await SignInNoticeSection({
      searchParams: Promise.resolve({ signin: 'failed' }),
    }),
  );
  expect(screen.getByRole('status')).toBeInTheDocument();

  rerender(await SignInNoticeSection({ searchParams: Promise.resolve({}) }));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
