import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { UserProfile } from '@/app/lib/definitions';
import ProfileCard from '@/app/ui/home/profile-card';

const base: UserProfile = {
  id: 'u1',
  displayName: 'Alex Example',
  email: 'alex@example.com',
  avatarUrl: 'https://cdn.test/a.png',
  firstSeenAt: '2026-10-25T09:15:00Z',
  lastSeenAt: '2026-10-25T09:15:00Z',
};

describe('ProfileCard fallbacks (data-model.md)', () => {
  it('nothing missing: name, email and image', () => {
    render(<ProfileCard profile={base} />);
    expect(screen.getByRole('heading')).toHaveTextContent(
      'Hello, Alex Example',
    );
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Alex Example' })).toHaveAttribute(
      'src',
      'https://cdn.test/a.png',
    );
  });

  it('no name: greets by email', () => {
    render(<ProfileCard profile={{ ...base, displayName: null }} />);
    expect(screen.getByRole('heading')).toHaveTextContent(
      'Hello, alex@example.com',
    );
  });

  it('no name and no email: just Hello, with a placeholder', () => {
    render(
      <ProfileCard
        profile={{ ...base, displayName: null, email: null, avatarUrl: null }}
      />,
    );
    expect(screen.getByRole('heading')).toHaveTextContent(/^Hello$/);
    expect(
      screen.getByRole('img', { name: 'Your avatar' }),
    ).toBeInTheDocument();
  });

  it('no avatar: initials from the name', () => {
    render(<ProfileCard profile={{ ...base, avatarUrl: null }} />);
    expect(screen.getByRole('img', { name: 'Alex Example' })).toHaveTextContent(
      'AE',
    );
  });
});
