import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import ErrorBoundary from '@/app/home/error';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.spyOn(console, 'error').mockImplementation(() => undefined);

const failure = Object.assign(
  new Error('API request failed with 500 at http://hl-budget-backend'),
  { digest: '2785437' },
);

it('shows a friendly message, Try again and a short reference only', () => {
  render(<ErrorBoundary error={failure} reset={vi.fn()} />);

  expect(
    screen.getByRole('heading', { name: 'Something went wrong' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  expect(screen.getByText('Reference: 2785437')).toBeInTheDocument();
  expect(screen.queryByText(/500|hl-budget-backend|API request/)).toBeNull();
});

it('Try again refreshes the route and resets the boundary', () => {
  const reset = vi.fn();
  render(<ErrorBoundary error={failure} reset={reset} />);

  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  expect(refresh).toHaveBeenCalledTimes(1);
  expect(reset).toHaveBeenCalledTimes(1);
});

it('omits the reference line when there is no digest', () => {
  render(<ErrorBoundary error={new Error('x')} reset={vi.fn()} />);
  expect(screen.queryByText(/Reference:/)).toBeNull();
});
