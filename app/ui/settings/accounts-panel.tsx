'use client';

import { createAccount, deleteAccount } from '@/app/lib/actions';
import type { NamedItem } from '@/app/lib/definitions';
import { inUse, MESSAGES } from '@/app/lib/messages';
import NamedListPanel from '@/app/ui/settings/named-list-panel';

/**
 * The caller's accounts with their spending counts (FR-082). An account in use, or the last one,
 * cannot be removed (FR-084, FR-086).
 */
export default function AccountsPanel({
  accounts,
}: {
  accounts: readonly NamedItem[];
}) {
  return (
    <NamedListPanel
      items={accounts}
      taken={accounts}
      create={createAccount}
      remove={deleteAccount}
      copy={{
        heading: 'Accounts',
        addLabel: 'New account',
        empty:
          'You have no accounts yet. Add one, or type a new account name when you record a spending.',
        emptyName: MESSAGES.accountName,
        refusal: (item, all) => {
          if (item.count > 0) return inUse('account', item.name, item.count);
          if (all.length === 1) return MESSAGES.lastAccount;
          return null;
        },
      }}
    />
  );
}
