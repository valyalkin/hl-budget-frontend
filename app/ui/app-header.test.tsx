import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppHeader from '@/app/ui/app-header';

describe('AppHeader', () => {
  it('signed out: the app name and a plain Sign in link, nothing else', () => {
    render(<AppHeader signedIn={false} />);
    expect(screen.getByText('HL-Budget')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/auth/login?returnTo=/spendings',
    );
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('signed in: Spendings, the settings slot and Sign out', () => {
    render(
      <AppHeader
        signedIn
        settingsSlot={<button type="button">User settings</button>}
      />,
    );
    expect(screen.getByRole('link', { name: 'Spendings' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.getByRole('button', { name: 'User settings' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign out' })).toHaveAttribute(
      'href',
      '/auth/logout',
    );
    expect(
      screen.queryByRole('link', { name: 'Sign in' }),
    ).not.toBeInTheDocument();
  });
});

describe('AppHeader tabs (specs/009)', () => {
  it('shows Spendings and Income, marking the page being shown', () => {
    render(<AppHeader signedIn ledger="income" />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Income' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(nav).getByRole('link', { name: 'Spendings' }),
    ).not.toHaveAttribute('aria-current');
    expect(within(nav).getByRole('link', { name: 'Income' })).toHaveAttribute(
      'href',
      '/income',
    );
  });
});
