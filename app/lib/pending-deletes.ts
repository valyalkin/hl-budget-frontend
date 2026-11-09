/**
 * Asks the entry table to delete, right away, every entry still waiting out its undo time
 * (specs/010 FR-018). Settings and the CSV import send it when they open, so they see the data as
 * the user expects it: a category or account used only by a removed entry can then be removed.
 */
export const FLUSH_DELETES_EVENT = 'hl-budget:flush-deletes';

export function flushPendingDeletes(): void {
  window.dispatchEvent(new CustomEvent(FLUSH_DELETES_EVENT));
}
