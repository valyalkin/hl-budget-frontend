'use client';

import { useImport } from '@/app/ui/import/import-provider';

/** "Added N spendings from [file]" after an import, until dismissed or the next import (FR-035). */
export default function ImportNotice() {
  const { notice, dismissNotice } = useImport();
  return (
    <div role="status" className="mx-auto max-w-7xl px-4 sm:px-6">
      {notice ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-tint py-1.5 pr-1.5 pl-4 text-sm font-medium text-brand-strong">
          {notice}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismissNotice}
            className="inline-flex size-7 items-center justify-center rounded-full hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-brand"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </p>
      ) : null}
    </div>
  );
}
