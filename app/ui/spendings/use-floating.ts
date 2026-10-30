'use client';

import {
  createContext,
  type RefObject,
  useContext,
  useLayoutEffect,
} from 'react';

/** Gap between the field and its popup, and the least distance kept from the window's edge. */
const GAP = 4;
const EDGE = 8;

/** Moves `popup` under (or above) `field`, inside the window. */
function place(field: HTMLElement, popup: HTMLElement, matchWidth: boolean) {
  const rect = field.getBoundingClientRect();
  if (matchWidth) {
    popup.style.minWidth = `${rect.width}px`;
  }
  const { offsetWidth: width, offsetHeight: height } = popup;
  const below = rect.bottom + GAP;
  const above = rect.top - GAP - height;
  const top =
    below + height > window.innerHeight - EDGE && above >= EDGE ? above : below;
  const left = Math.max(
    EDGE,
    Math.min(rect.left, window.innerWidth - width - EDGE),
  );
  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
  popup.style.visibility = 'visible';
}

/**
 * Places a popup under its field, or above it when the window has no room below, and keeps it
 * inside the window. The popup is portalled to the page body with fixed coordinates, so the
 * spendings table's scrolling and rounded corners cannot clip it. It follows the field while the
 * page scrolls or the window resizes. `matchWidth` makes the popup at least as wide as the field.
 */
export function useFloating(
  open: boolean,
  anchor: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>,
  { matchWidth = false }: { matchWidth?: boolean } = {},
) {
  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }
    const update = () => {
      const field = anchor.current;
      const popup = panel.current;
      if (!field || !popup) {
        return;
      }
      place(field, popup, matchWidth);
    };
    update();
    // The popup's own size changes as the list filters, so watch it as well as the page.
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (panel.current) {
      observer?.observe(panel.current);
    }
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchor, panel, matchWidth]);
}

/** Starting style for a floating popup: hidden until the first placement has run. */
export const FLOATING_START = {
  top: 0,
  left: 0,
  visibility: 'hidden',
} as const;

/**
 * Where floating popups are portalled. A modal `<dialog>` (the CSV import) is in the browser's top
 * layer and makes the rest of the page inert, so a popup portalled to the body would be hidden
 * behind it and unclickable. Such a dialog provides itself here; fixed coordinates still work
 * inside it because it has no transform (specs/004-csv-import FR-025).
 */
export const FloatingRoot = createContext<HTMLElement | null>(null);

/**
 * The element to portal a popup into: the enclosing dialog's, else the page body (null while
 * rendering on the server, where popups are never open).
 */
export function useFloatingRoot(): HTMLElement | null {
  const root = useContext(FloatingRoot);
  return root ?? (typeof document === 'undefined' ? null : document.body);
}
