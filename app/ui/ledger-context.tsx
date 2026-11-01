'use client';

import { createContext, useContext } from 'react';
import { LEDGER, type Ledger, type LedgerText } from '@/app/lib/ledger';

const LedgerContext = createContext<Ledger>('spendings');

/**
 * Which ledger the screens below show (specs/009 research R-006). Without a provider every
 * component shows spendings, exactly as before feature 009.
 */
export function LedgerProvider({
  ledger,
  children,
}: {
  ledger: Ledger;
  children: React.ReactNode;
}) {
  return <LedgerContext value={ledger}>{children}</LedgerContext>;
}

/** The current ledger and its wording. */
export function useLedger(): { ledger: Ledger; text: LedgerText } {
  const ledger = useContext(LedgerContext);
  return { ledger, text: LEDGER[ledger] };
}
