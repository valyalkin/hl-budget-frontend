'use client';

import { createAccount, deleteAccount } from '@/app/lib/actions';
import type { NamedItem } from '@/app/lib/definitions';
import { accountUsage, inUse, MESSAGES } from '@/app/lib/messages';
import NamedListPanel from '@/app/ui/settings/named-list-panel';

/**
 * The caller's accounts with their spending and income counts (FR-082, specs/009 FR-053). An
 * account in use by either, or the last one, cannot be removed (FR-084, FR-086, specs/009 FR-052).
 */
export default function AccountsPanel({
  accounts,
}: {
  accounts: readonly (NamedItem & { incomeCount?: number })[];
}) {
  const incomeOf = (item: NamedItem) =>
    accounts.find((a) => a.id === item.id)?.incomeCount ?? 0;
  return (
    <NamedListPanel
      items={accounts}
      taken={accounts}
      create={createAccount}
      remove={deleteAccount}
      copy={{
        heading: 'Accounts',
        addLabel: 'New account',
        empty: MESSAGES.noAccountsYet,
        emptyName: MESSAGES.accountName,
        describe: (item) => accountUsage(item.count, incomeOf(item)),
        refusal: (item, all) => {
          if (item.count > 0 || incomeOf(item) > 0) {
            return inUse('account', item.name, item.count, incomeOf(item));
          }
          if (all.length === 1) return MESSAGES.lastAccount;
          return null;
        },
      }}
    />
  );
}
