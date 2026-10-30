'use client';

import { type ImportLookups, useImport } from '@/app/ui/import/import-provider';

/**
 * "Import CSV", above the month total card (FR-001). Unavailable while a row of the Spendings
 * table is open for adding or editing, like the + button (spec Edge Case "Open entry row").
 */
export default function ImportCsvButton({
  lookups,
}: {
  lookups: ImportLookups;
}) {
  const { open, rowOpen } = useImport();
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      disabled={rowOpen}
      onClick={() => open(lookups)}
      className="flex min-h-11 items-center justify-center gap-2.5 rounded-xl border border-brand bg-surface px-4 font-semibold text-brand hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:border-line disabled:text-disabled disabled:hover:bg-surface"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8 11V2.5M4.5 6L8 2.5 11.5 6M2.5 10v3.5h11V10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Import CSV
    </button>
  );
}
