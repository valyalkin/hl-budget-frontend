import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoadError from '@/app/ui/load-error';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('@/app/lib/report-client-error', () => ({
  reportClientError: vi.fn(),
}));

describe('LoadError', () => {
  it('words a ledger failure by default', () => {
    render(
      <LoadError error={new Error('x')} reset={vi.fn()} ledger="income" />,
    );
    expect(
      screen.getByText('We couldn’t load your income.'),
    ).toBeInTheDocument();
  });

  it('takes its own message, for the Overview (specs/011 FR-026)', async () => {
    const { reportClientError } = await import('@/app/lib/report-client-error');
    render(
      <LoadError
        error={new Error('x')}
        reset={vi.fn()}
        boundary="overview"
        message="We couldn’t load your overview. Try again in a moment."
      />,
    );
    expect(
      screen.getByText(
        'We couldn’t load your overview. Try again in a moment.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument();
    expect(reportClientError).toHaveBeenCalledWith(
      expect.any(Error),
      'overview',
    );
  });
});
