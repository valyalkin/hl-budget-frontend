'use client';

import { type KeyboardEvent, useId, useRef, useState } from 'react';
import type { NamedItem } from '@/app/lib/definitions';
import AccountsPanel from '@/app/ui/settings/accounts-panel';
import CategoriesPanel from '@/app/ui/settings/categories-panel';

type Section = 'categories' | 'accounts';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'categories', label: 'Categories' },
  { id: 'accounts', label: 'Accounts' },
];

/**
 * The user-settings button and its window (US6, research R-011): a native modal <dialog>, so focus
 * is trapped and Escape closes it; a click on the backdrop closes it too. Sections are a vertical
 * tab list on the left.
 */
export default function SettingsDialog({
  categories,
  accounts,
}: {
  categories: (NamedItem & { isDefault: boolean })[];
  accounts: NamedItem[];
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const tabs = useRef<Partial<Record<Section, HTMLButtonElement | null>>>({});
  const [section, setSection] = useState<Section>('categories');

  const openDialog = () => dialog.current?.showModal();
  const closeDialog = () => dialog.current?.close();

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    const index = SECTIONS.findIndex((s) => s.id === section);
    const nextIndex =
      (index + (event.key === 'ArrowDown' ? 1 : -1) + SECTIONS.length) %
      SECTIONS.length;
    const next = SECTIONS[nextIndex]?.id ?? 'categories';
    setSection(next);
    tabs.current[next]?.focus();
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label="User settings"
        aria-haspopup="dialog"
        onClick={openDialog}
        className="inline-flex size-10 items-center justify-center rounded-full text-ink-2 ring-1 ring-line hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="10"
            cy="7"
            r="3.5"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M3.5 17c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {/* A click on the backdrop lands on the <dialog> itself; the keyboard closes it with Escape. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDialog();
          }
        }}
        onClose={() => trigger.current?.focus()}
        className="m-auto max-h-[calc(100vh-2rem)] w-[min(56rem,calc(100vw-2rem))] rounded-2xl bg-surface p-0 text-ink shadow-xl"
      >
        <div className="flex max-h-[calc(100vh-2rem)] flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id={`${id}-title`} className="font-display text-xl font-bold">
              Settings
            </h2>
            <button
              type="button"
              aria-label="Close settings"
              onClick={closeDialog}
              className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-brand"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            <div
              role="tablist"
              aria-orientation="vertical"
              aria-label="Settings sections"
              className="flex shrink-0 gap-1 border-b border-line p-3 sm:w-48 sm:flex-col sm:border-r sm:border-b-0"
            >
              {SECTIONS.map(({ id: sectionId, label }) => (
                <button
                  key={sectionId}
                  ref={(element) => {
                    tabs.current[sectionId] = element;
                  }}
                  type="button"
                  role="tab"
                  id={`${id}-tab-${sectionId}`}
                  aria-selected={section === sectionId}
                  aria-controls={`${id}-panel-${sectionId}`}
                  tabIndex={section === sectionId ? 0 : -1}
                  onClick={() => setSection(sectionId)}
                  onKeyDown={onTabKeyDown}
                  className={`h-10 rounded-lg px-3 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand ${
                    section === sectionId
                      ? 'bg-brand-tint text-brand-strong'
                      : 'text-ink-2 hover:bg-line-soft'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id={`${id}-panel-${section}`}
              aria-labelledby={`${id}-tab-${section}`}
              className="min-h-0 flex-1 overflow-y-auto p-5"
            >
              {section === 'categories' ? (
                <CategoriesPanel categories={categories} />
              ) : (
                <AccountsPanel accounts={accounts} />
              )}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
