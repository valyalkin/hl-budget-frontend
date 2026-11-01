/**
 * Asks the Settings window to open on a section from anywhere on the page (specs/007 FR-024): the
 * window lives in the header, apart from the entry row that needs it when there are no accounts.
 */
export type SettingsSection = 'categories' | 'accounts';

export const OPEN_SETTINGS_EVENT = 'hl-budget:open-settings';

export function openSettings(section: SettingsSection): void {
  window.dispatchEvent(
    new CustomEvent<SettingsSection>(OPEN_SETTINGS_EVENT, { detail: section }),
  );
}
