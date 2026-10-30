'use client';

import { createContext, type ReactNode, useContext, useState } from 'react';
import type { ImportRow } from '@/app/lib/csv-import';
import type { MerchantOption, NamedItem } from '@/app/lib/definitions';
import ImportDialog from '@/app/ui/import/import-dialog';

/** What the review needs from the Spendings page: autofill data, today and the currency. */
export type ImportLookups = {
  categories: readonly NamedItem[];
  accounts: readonly NamedItem[];
  merchants: readonly MerchantOption[];
  today: string;
  currency: string;
};

type Stage = 'closed' | 'pick' | 'review';

type ImportState = {
  stage: Stage;
  lookups: ImportLookups | null;
  fileName: string;
  rows: ImportRow[];
  /** Changes each time a file is read, so the review starts fresh (US4 #3). */
  session: number;
  notice: string | null;
};

export type ImportContextValue = ImportState & {
  rowOpen: boolean;
  open: (lookups: ImportLookups) => void;
  close: () => void;
  toPick: () => void;
  toReview: (fileName: string, rows: ImportRow[]) => void;
  finish: (notice: string) => void;
  dismissNotice: () => void;
  /** Stable across renders (a state setter), so effects can depend on it safely. */
  setRowOpen: (open: boolean) => void;
};

const ImportContext = createContext<ImportContextValue | null>(null);

/** The import session, for the button, the notice and the dialog. */
export function useImport(): ImportContextValue {
  const value = useContext(ImportContext);
  if (!value) {
    throw new Error('useImport() needs an <ImportProvider> above it');
  }
  return value;
}

/** The import session when there is one; the Spendings table also renders without it. */
export function useOptionalImport(): ImportContextValue | null {
  return useContext(ImportContext);
}

const CLOSED: ImportState = {
  stage: 'closed',
  lookups: null,
  fileName: '',
  rows: [],
  session: 0,
  notice: null,
};

/**
 * Holds the CSV import's state for the Spendings page (specs/004-csv-import research R-010). It
 * sits outside the page's <Suspense>, so the "Added …" notice survives the switch to the month of
 * the imported spendings. Nothing here is stored: the file's rows live only while the dialog is open.
 */
export default function ImportProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImportState>(CLOSED);
  const [rowOpen, setRowOpen] = useState(false);

  const value: ImportContextValue = {
    ...state,
    rowOpen,
    setRowOpen,
    open: (lookups) =>
      setState((s) => ({
        ...s,
        stage: 'pick',
        lookups,
        fileName: '',
        rows: [],
        notice: null,
      })),
    close: () =>
      setState((s) => ({ ...s, stage: 'closed', fileName: '', rows: [] })),
    toPick: () =>
      setState((s) => ({ ...s, stage: 'pick', fileName: '', rows: [] })),
    toReview: (fileName, rows) =>
      setState((s) => ({
        ...s,
        stage: 'review',
        fileName,
        rows,
        session: s.session + 1,
      })),
    finish: (notice) =>
      setState((s) => ({
        ...s,
        stage: 'closed',
        fileName: '',
        rows: [],
        notice,
      })),
    dismissNotice: () => setState((s) => ({ ...s, notice: null })),
  };

  return (
    <ImportContext value={value}>
      {children}
      {state.stage !== 'closed' && state.lookups ? <ImportDialog /> : null}
    </ImportContext>
  );
}
