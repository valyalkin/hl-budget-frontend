'use client';

import { type ChangeEvent, useState } from 'react';
import {
  checkFile,
  type ImportLookups,
  readImport,
} from '@/app/lib/csv-import';
import { MESSAGES, PHONE } from '@/app/lib/messages';
import { CloseIcon, UploadIcon } from '@/app/ui/phone/icons';
import PhoneDialog from '@/app/ui/phone/phone-dialog';
import { usePhoneUi } from '@/app/ui/phone/phone-ui-provider';

/**
 * Import CSV, step 1 (FR-090 – FR-092): a large Choose file button (no drag and drop on a phone)
 * and what the file should contain. The file is read here, in the browser, by the desktop's
 * rules; it is never uploaded.
 */
export default function PhoneImport({ lookups }: { lookups: ImportLookups }) {
  const ui = usePhoneUi();
  const [error, setError] = useState('');

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    setError('');
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
    ui.setImportSession({
      fileName: file.name,
      rows: result.rows,
      idempotencyKey: crypto.randomUUID(),
    });
    ui.open({ kind: 'review' });
  };

  return (
    <PhoneDialog
      variant="screen"
      label="Import CSV"
      onDismiss={() => ui.close()}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-2 py-1 pt-[max(0.25rem,env(safe-area-inset-top))]">
        <button
          type="button"
          aria-label="Close import"
          onClick={() => ui.close()}
          className="inline-flex size-11 items-center justify-center rounded-full text-ink-2 focus-visible:outline-2 focus-visible:outline-brand active:bg-line-soft"
        >
          <CloseIcon />
        </button>
        <h1 className="font-display text-lg font-bold">Import CSV</h1>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5">
        <p className="text-ink-2">{PHONE.importIntro}</p>
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-line bg-surface px-4 py-8 text-center">
          <UploadIcon className="size-8 text-brand" />
          <p className="font-semibold">Choose a CSV file</p>
          <label className="relative inline-flex min-h-13 w-full cursor-pointer items-center justify-center rounded-xl bg-brand px-6 text-base font-semibold text-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand active:bg-brand-strong">
            Choose file
            <input
              type="file"
              accept=".csv,text/csv"
              aria-label="Choose a CSV file"
              onChange={(event) => void onFile(event)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-error-tint px-4 py-3 text-sm font-medium text-error"
          >
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-1 rounded-2xl bg-surface-2 px-4 py-3 ring-1 ring-line-soft">
          <span className="text-sm font-semibold">{PHONE.importNoteTitle}</span>
          <span className="text-sm text-muted">{PHONE.importNote}</span>
        </div>
      </div>
    </PhoneDialog>
  );
}
