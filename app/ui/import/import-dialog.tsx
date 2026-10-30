'use client';

import { useRouter } from 'next/navigation';
import { type SyntheticEvent, useEffect, useId, useState } from 'react';
import { added, MESSAGES } from '@/app/lib/messages';
import { useImport } from '@/app/ui/import/import-provider';
import PickStage from '@/app/ui/import/pick-stage';
import ReviewStage from '@/app/ui/import/review-stage';
import { FloatingRoot } from '@/app/ui/spendings/use-floating';

/**
 * The CSV import window (US1–US4): a native modal <dialog>, so focus stays inside, the page behind
 * is inert and Escape is a cancel request (FR-002). It shows the pick stage, then the review.
 * Escape in the review goes back to the pick stage (FR-041); popups inside the review stop the
 * Escape themselves while they are open. Popups are portalled into the dialog (FR-025).
 */
export default function ImportDialog() {
  const router = useRouter();
  const id = useId();
  const pickHeading = `${id}-pick`;
  const reviewHeading = `${id}-review`;
  const {
    stage,
    lookups,
    fileName,
    rows,
    session,
    close,
    toPick,
    toReview,
    finish,
  } = useImport();
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);

  useEffect(() => {
    // showModal() throws on a dialog that is already open (development runs effects twice).
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [dialog]);

  if (!lookups) {
    return null;
  }

  const onCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (stage === 'review') {
      event.preventDefault();
      toPick();
    }
  };

  return (
    <dialog
      ref={setDialog}
      aria-labelledby={stage === 'review' ? reviewHeading : pickHeading}
      onCancel={onCancel}
      onClose={close}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40 ${
        stage === 'review' ? 'max-w-5xl' : 'max-w-xl'
      }`}
    >
      <FloatingRoot value={dialog}>
        {stage === 'review' ? (
          <ReviewStage
            key={session}
            headingId={reviewHeading}
            fileName={fileName}
            initialRows={rows}
            lookups={lookups}
            onCancel={toPick}
            onAdded={(month, count) => {
              finish(added(count, fileName));
              router.push(`/spendings?month=${month}`);
            }}
            onAlreadyImported={() => {
              finish(MESSAGES.alreadyImported);
              router.refresh();
            }}
          />
        ) : (
          <PickStage
            headingId={pickHeading}
            lookups={lookups}
            onRows={toReview}
            onClose={close}
          />
        )}
      </FloatingRoot>
    </dialog>
  );
}
