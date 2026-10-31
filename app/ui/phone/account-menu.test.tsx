import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import AccountMenu from '@/app/ui/phone/account-menu';
import type { PhoneUi } from '@/app/ui/phone/phone-ui-provider';
import { renderPhone, UiProbe } from '@/app/ui/phone/test-support';

let ui: PhoneUi;
const grab = (next: PhoneUi) => {
  ui = next;
};

function setup() {
  renderPhone(
    <>
      <UiProbe onUi={grab} />
      <AccountMenu />
    </>,
  );
  act(() => ui.open({ kind: 'menu' }));
}

beforeEach(() => window.history.replaceState(null, '', '/spendings'));

describe('AccountMenu', () => {
  it('offers Settings, Import CSV and a plain Sign out link', () => {
    setup();
    expect(
      screen.getByRole('dialog', { name: 'Account menu' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Settings' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Import CSV' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign out' })).toHaveAttribute(
      'href',
      '/auth/logout',
    );
  });

  it('opens Settings in place of the menu', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByTestId('state')).toHaveTextContent('settings');
  });

  it('opens Import CSV in place of the menu', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    expect(screen.getByTestId('state')).toHaveTextContent('import');
  });

  it('closes from its backdrop', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent('list'),
    );
  });
});
