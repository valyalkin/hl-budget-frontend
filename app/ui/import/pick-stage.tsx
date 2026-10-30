'use client';

import { type DragEvent, useState } from 'react';
import {
  checkFile,
  type ImportLookups,
  type ImportRow,
  readImport,
} from '@/app/lib/csv-import';
import { MESSAGES } from '@/app/lib/messages';
import { CloseIcon } from '@/app/ui/import/icons';

/**
 * The first stage of the import (US1, US3, research R-012): drop a CSV file or choose one, or
 * download the sample. The file is read here, in the browser, and never sent anywhere (FR-051).
 */
export default function PickStage({
  headingId,
  lookups,
  onRows,
  onClose,
}: {
  headingId: string;
  lookups: ImportLookups;
  onRows: (fileName: string, rows: ImportRow[]) => void;
  onClose: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const take = async (files: FileList | null | undefined) => {
    const file = files?.[0];
    if (!file) {
      return;
    }
    const refusal = checkFile(file);
    if (refusal) {
      setError(MESSAGES[refusal]);
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setError(MESSAGES.unreadable);
      return;
    }
    const result = readImport(text, lookups);
    if ('error' in result) {
      setError(MESSAGES[result.error]);
      return;
    }
    setError(null);
    onRows(file.name, result.rows);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void take(event.dataTransfer.files);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-line-soft px-6 py-4">
        <h2 id={headingId} className="font-display text-[22px] font-bold">
          Import CSV
        </h2>
        <button
          type="button"
          aria-label="Close import"
          onClick={onClose}
          className="inline-flex size-11 items-center justify-center rounded-xl text-ink-2 hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-brand"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="flex flex-col gap-4 px-6 py-5">
        <p className="text-sm text-muted">
          Upload a CSV export from your bank or card. You’ll check every row
          before anything is added.
        </p>
        {/* Dropping a file is pointer-only; the keyboard uses "Choose file" inside the same area. */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div
          data-testid="drop-area"
          data-dragging={dragging}
          onDragOver={onDragOver}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center ${
            dragging ? 'border-brand bg-brand-tint' : 'border-line bg-surface-2'
          }`}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="text-brand"
          >
            <path
              d="M8 11V2.5M4.5 6L8 2.5 11.5 6M2.5 10v3.5h11V10"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="font-semibold">Drop your CSV file here</p>
          <p className="text-sm text-muted">or</p>
          <label className="relative inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-brand px-5 font-semibold text-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand hover:bg-brand-strong">
            Choose file
            <input
              type="file"
              accept=".csv,text/csv"
              aria-label="Choose a CSV file"
              onChange={(event) => {
                void take(event.target.files);
                event.target.value = '';
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-error">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-1 rounded-xl bg-surface-2 px-4 py-3 text-sm">
          <span className="font-semibold">What the file should contain</span>
          <span className="text-muted">
            Columns for date, merchant, category, account and amount, with a
            header row. The order doesn’t matter, and anything missing can be
            filled in on the next screen.
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-line-soft px-6 py-4">
        <span />
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-xl border border-line bg-surface px-5 font-medium hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-brand"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
