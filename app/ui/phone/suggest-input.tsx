'use client';

import clsx from 'clsx';
import { type KeyboardEvent, type Ref, useId, useState } from 'react';
import { rankSuggestions, type Suggestible } from '@/app/lib/utils';

const MAX_OPTIONS = 6;

/**
 * A type-or-pick field for merchant, category and account (FR-045, FR-046, research R-007):
 * while it has focus it lists up to 6 matches, most used first, as 44px options to tap. Text that
 * matches nothing is kept as typed (a new name, created on save).
 */
export default function SuggestInput<T extends Suggestible>({
  label,
  value,
  onChange,
  items,
  onPick,
  placeholder,
  inputRef,
  invalid,
  describedBy,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  items: readonly T[];
  onPick?: (item: T) => void;
  placeholder?: string;
  inputRef?: Ref<HTMLInputElement>;
  invalid?: boolean;
  describedBy?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ranked = rankSuggestions(value, items).slice(0, MAX_OPTIONS);
  const exact =
    ranked.length === 1 &&
    ranked[0]?.name.toLocaleLowerCase('en-CA') ===
      value.trim().toLocaleLowerCase('en-CA');
  const expanded = open && ranked.length > 0 && !exact;

  const pick = (item: T) => {
    onChange(item.name);
    onPick?.(item);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!expanded) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((active + step + ranked.length) % ranked.length);
    } else if (event.key === 'Enter' && ranked[active]) {
      event.preventDefault();
      pick(ranked[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink-2">
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        autoCapitalize="words"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={
          expanded && active >= 0 ? `${listId}-${active}` : undefined
        }
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={clsx(
          'h-12 w-full rounded-xl bg-surface px-3 text-base text-ink ring-1 placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
          invalid ? 'ring-error' : 'ring-line',
        )}
      />
      {expanded ? (
        <div
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="overflow-hidden rounded-xl bg-surface ring-1 ring-line"
        >
          {ranked.map((item, index) => (
            <div
              key={item.name}
              id={`${listId}-${index}`}
              role="option"
              tabIndex={-1}
              aria-selected={index === active}
              // Keep focus in the input, so the list doesn't close before the tap lands.
              onPointerDown={(event) => event.preventDefault()}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(item)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  pick(item);
                }
              }}
              className={clsx(
                'flex min-h-11 cursor-pointer items-center justify-between gap-4 border-t border-line-soft px-3 first:border-t-0',
                index === active
                  ? 'bg-brand-tint text-brand-strong'
                  : 'text-ink',
              )}
            >
              <span className="truncate">{item.name}</span>
              {item.count > 0 ? (
                <span className="text-xs text-muted tabular-nums">
                  {item.count}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
