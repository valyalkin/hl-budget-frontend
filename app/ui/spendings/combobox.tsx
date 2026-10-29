'use client';

import {
  type KeyboardEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  bestCompletion,
  exactMatch,
  rankSuggestions,
  type Suggestible,
} from '@/app/lib/utils';
import { FLOATING_START, useFloating } from '@/app/ui/spendings/use-floating';

const MAX_SHOWN = 8;

type Props = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (text: string) => void;
  options: readonly Suggestible[];
  /** Called with the accepted text on Tab or Enter, and on blur. */
  onCommit?: (text: string) => void;
  /** Row-level keys, called after the combobox has handled its own (FR-053–FR-056). */
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: (element: HTMLInputElement | null) => void;
  invalid?: boolean;
  describedBy?: string;
  /** Show "Create “x”" when the text names no option (categories and accounts, not merchants). */
  createHint?: boolean;
  maxLength?: number;
};

/**
 * A WAI-ARIA 1.2 combobox with inline autofill (FR-050–FR-052, research R-010). As the user types,
 * the input fills in the most used option starting with the typed text, with the untyped rest
 * selected; Backspace removes the rest; Tab or Enter accepts it. The list shows every match, most
 * used first; arrow keys move through it and Enter or Tab picks the highlighted option. Escape
 * closes the list before it does anything else.
 */
export default function Combobox({
  label,
  placeholder,
  value,
  onChange,
  options,
  onCommit,
  onKeyDown,
  inputRef,
  invalid = false,
  describedBy,
  createHint = false,
  maxLength,
}: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [active, setActive] = useState(-1);
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const ownRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const ranked = rankSuggestions(filter, options).slice(0, MAX_SHOWN);
  const showCreate =
    createHint && value.trim() !== '' && !exactMatch(value, options);
  const expanded = open && (ranked.length > 0 || showCreate);
  useFloating(expanded, ownRef, listRef, { matchWidth: true });

  // Select the autofilled remainder once the new value is in the input.
  useLayoutEffect(() => {
    if (selection && ownRef.current) {
      ownRef.current.setSelectionRange(selection.start, selection.end);
      setSelection(null);
    }
  }, [selection]);

  const setRefs = (element: HTMLInputElement | null) => {
    ownRef.current = element;
    inputRef?.(element);
  };

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  /** Accepting settles the text on the option's own spelling when it names one. */
  const accept = (text: string) => {
    const spelled = exactMatch(text, options)?.name ?? text;
    if (spelled !== text) {
      onChange(spelled);
    }
    const input = ownRef.current;
    if (input) {
      input.setSelectionRange(spelled.length, spelled.length);
    }
    close();
    onCommit?.(spelled);
  };

  const handleChange = (text: string, deleting: boolean) => {
    setFilter(text);
    setOpen(true);
    setActive(-1);
    const best = deleting
      ? null
      : bestCompletion(text, rankSuggestions(text, options));
    if (best) {
      // Keep what the user typed as typed; only the rest comes from the suggestion.
      onChange(text + best.name.slice(text.length));
      setSelection({ start: text.length, end: best.name.length });
    } else {
      onChange(text);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      const last = ranked.length - 1;
      setActive((current) =>
        event.key === 'ArrowDown'
          ? Math.min(current + 1, last)
          : Math.max(current - 1, 0),
      );
      return;
    }
    if (event.key === 'Escape' && expanded) {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      const picked = expanded && active >= 0 ? ranked[active] : undefined;
      if (picked) {
        onChange(picked.name);
        accept(picked.name);
      } else {
        accept(value);
      }
    }
    onKeyDown?.(event);
  };

  const pick = (name: string) => {
    onChange(name);
    setFilter(name);
    accept(name);
  };

  return (
    <div className="relative">
      <input
        ref={setRefs}
        type="text"
        role="combobox"
        aria-label={label}
        aria-autocomplete="both"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={
          expanded && active >= 0 ? `${listId}-${active}` : undefined
        }
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        onChange={(event) => {
          const inputType = (event.nativeEvent as InputEvent).inputType ?? '';
          handleChange(event.target.value, inputType.startsWith('delete'));
        }}
        onKeyDown={handleKeyDown}
        onFocus={(event) => {
          event.currentTarget.select();
          setFilter('');
          setOpen(true);
        }}
        onBlur={() => accept(value)}
        className={`h-9 w-full min-w-0 rounded-lg border bg-surface px-2.5 text-sm placeholder:text-muted focus:outline-2 focus:outline-brand ${
          invalid ? 'border-error' : 'border-line'
        }`}
      />
      {expanded
        ? createPortal(
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={`${label} suggestions`}
              style={FLOATING_START}
              className="fixed z-30 max-h-72 w-max overflow-auto rounded-lg bg-surface py-1 text-sm shadow-lg ring-1 ring-line"
            >
              {ranked.map((option, index) => (
                <div
                  key={option.name}
                  id={`${listId}-${index}`}
                  role="option"
                  tabIndex={-1}
                  aria-selected={index === active}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pick(option.name);
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-4 px-3 py-1.5 ${
                    index === active
                      ? 'bg-brand-tint text-brand-strong'
                      : 'text-ink'
                  }`}
                >
                  <span>{option.name}</span>
                  {option.count > 0 ? (
                    <span className="text-xs text-muted tabular-nums">
                      {option.count}
                    </span>
                  ) : null}
                </div>
              ))}
              {showCreate ? (
                <div
                  role="presentation"
                  className="px-3 py-1.5 text-xs text-muted"
                >
                  Create “{value.trim()}” on save
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
