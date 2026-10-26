import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import Avatar from '@/app/ui/home/avatar';

it('shows the image with alt text and no referrer', () => {
  render(<Avatar url="https://cdn.test/a.png" initials="AE" label="Alex" />);
  const image = screen.getByRole('img', { name: 'Alex' });
  expect(image).toHaveAttribute('src', 'https://cdn.test/a.png');
  expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');
});

it('swaps a broken image for the initials', () => {
  render(
    <Avatar url="https://cdn.test/broken.png" initials="AE" label="Alex" />,
  );
  fireEvent.error(screen.getByRole('img', { name: 'Alex' }));
  expect(screen.getByRole('img', { name: 'Alex' })).toHaveTextContent('AE');
});

it('shows the initials when there is no URL', () => {
  render(<Avatar url={null} initials="Z" label="Your avatar" />);
  expect(screen.getByRole('img', { name: 'Your avatar' })).toHaveTextContent(
    'Z',
  );
});

it('shows a neutral icon when there are no initials either', () => {
  render(<Avatar url={null} initials={null} label="Your avatar" />);
  const placeholder = screen.getByRole('img', { name: 'Your avatar' });
  expect(placeholder).toHaveTextContent('');
  expect(screen.getByTestId('neutral-avatar-icon')).toBeInTheDocument();
});
