import type { KeyboardEvent } from 'react';
import type { MerchantOption } from '@/app/lib/definitions';
import { type Draft, type Field, FIELDS } from '@/app/lib/draft';
import { exactMatch } from '@/app/lib/utils';

/**
 * Keyboard and fill-in rules shared by the Spendings table's entry row and the CSV import's review
 * rows (feature 003 FR-053, FR-058; feature 004 FR-023).
 */

/**
 * Which way a Left or Right arrow should leave a field: -1, 1, or 0 to stay. A text field is left
 * only when the cursor is already at that end, or the whole text is selected, so the arrows still
 * move the cursor inside the text. Any modifier keeps the browser's own behaviour.
 */
export function arrowStep(event: KeyboardEvent<HTMLElement>): -1 | 0 | 1 {
  const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key] as
    -1 | 1 | undefined;
  if (
    !step ||
    event.shiftKey ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return 0;
  }
  const element = event.currentTarget;
  if (!(element instanceof HTMLInputElement)) {
    return step;
  }
  const { value, selectionStart: start, selectionEnd: end } = element;
  const whole = start === 0 && end === value.length;
  const edge = step === 1 ? value.length : 0;
  return whole || (start === edge && end === edge) ? step : 0;
}

/** The field before (-1) or after (1) `field` in Tab order, or undefined at either end. */
export function nextField(field: Field, step: -1 | 1): Field | undefined {
  return FIELDS[FIELDS.indexOf(field) + step];
}

/**
 * What accepting a past merchant fills in: its latest category and account, only where the draft
 * has none yet. Empty when `text` is not a past merchant or nothing is empty.
 */
export function merchantFillIn(
  draft: Draft,
  text: string,
  merchants: readonly MerchantOption[],
): Partial<Draft> {
  const merchant = exactMatch(text, merchants);
  if (!merchant) {
    return {};
  }
  const patch: Partial<Draft> = {};
  if (!draft.category.trim()) {
    patch.category = merchant.lastCategory.name;
  }
  if (!draft.account.trim()) {
    patch.account = merchant.lastAccount.name;
  }
  return patch;
}
