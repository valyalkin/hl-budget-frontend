import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import NotFound, { metadata } from '@/app/not-found';

it('explains the miss and links back to the landing page', () => {
  render(<NotFound />);
  expect(
    screen.getByRole('heading', { name: 'Page not found' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Back to HL Budget' }),
  ).toHaveAttribute('href', '/');
});

it('is titled and not indexed', () => {
  expect(metadata.title).toBe('Not found');
  expect(metadata.robots).toEqual({ index: false });
});
