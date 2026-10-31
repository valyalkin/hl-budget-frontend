'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ImportRow } from '@/app/lib/csv-import';

/**
 * One layer over the Spendings list: a full-screen screen or a bottom sheet. Each open layer owns
 * one browser history entry, so the phone's back gesture closes the top one (research R-006).
 */
export type Layer =
  | { kind: 'menu' }
  | { kind: 'edit'; spendingId?: string }
  | { kind: 'confirm-delete' }
  | { kind: 'settings' }
  | { kind: 'import' }
  | { kind: 'review' }
  | { kind: 'fix-row'; key: string };

/** The CSV being reviewed; held only while the import screens are open (data-model.md). */
export type ImportSession = {
  fileName: string;
  rows: ImportRow[];
  idempotencyKey: string;
};

export type PhoneUi = {
  layers: readonly Layer[];
  view: 'spendings' | 'by-category';
  chart: 'table' | 'pie';
  notice: string;
  importSession: ImportSession | null;
  /** Opens a layer on top, with its own history entry. */
  open: (layer: Layer) => void;
  /** Swaps the top layer for another without a new history entry (menu → Settings). */
  replaceTop: (layer: Layer) => void;
  /** Closes the top `count` layers through history; `then` runs once they are closed. */
  close: (count?: number, then?: () => void) => void;
  /** Closes every layer (the layout switched to desktop). */
  reset: () => void;
  setView: (view: PhoneUi['view']) => void;
  setChart: (chart: PhoneUi['chart']) => void;
  notify: (text: string) => void;
  clearNotice: () => void;
  setImportSession: (session: ImportSession | null) => void;
};

const PhoneUiContext = createContext<PhoneUi | null>(null);

/** Our marker on the history entries we push: how many layers are open on that entry. */
type PhoneHistoryState = { hlbPhone?: number } | null;

function depthOf(state: unknown): number {
  const depth = (state as PhoneHistoryState)?.hlbPhone;
  return typeof depth === 'number' && depth > 0 ? depth : 0;
}

/**
 * The phone layout's state (data-model.md "Phone UI state"). It sits outside the page's
 * <Suspense>, so the chosen views and the notice survive a month change.
 */
export default function PhoneUiProvider({ children }: { children: ReactNode }) {
  const [layers, setLayersState] = useState<readonly Layer[]>([]);
  const layersRef = useRef<readonly Layer[]>([]);
  const [view, setViewState] = useState<PhoneUi['view']>('spendings');
  const [chart, setChartState] = useState<PhoneUi['chart']>('table');
  const [notice, setNotice] = useState('');
  const [importSession, setImportSession] = useState<ImportSession | null>(
    null,
  );
  const depth = useRef(0);
  const pendingThen = useRef<(() => void) | null>(null);

  // Stable, so an unmount cleanup can call it (it only touches refs and history).
  const [reset] = useState(() => () => {
    if (depth.current > 0) {
      pendingThen.current = null;
      window.history.go(-depth.current);
    }
  });

  const setLayers = (next: readonly Layer[]) => {
    layersRef.current = next;
    setLayersState(next);
  };

  useEffect(() => {
    // A reload on an open layer shows the list; forget the stale marker (FR-103).
    if (depthOf(window.history.state) > 0) {
      window.history.replaceState(
        { ...(window.history.state as object), hlbPhone: 0 },
        '',
      );
    }
    const onPopState = (event: PopStateEvent) => {
      const target = depthOf(event.state);
      if (target > depth.current) {
        // Forward onto an entry whose layer is gone: step back to where we are.
        window.history.go(depth.current - target);
        return;
      }
      depth.current = target;
      const kept = layersRef.current.slice(0, target);
      setLayers(kept);
      // Leaving the review discards its rows and fixes (FR-099).
      if (!kept.some((layer) => layer.kind === 'review')) {
        setImportSession(null);
      }
      const then = pendingThen.current;
      pendingThen.current = null;
      then?.();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const value: PhoneUi = {
    layers,
    view,
    chart,
    notice,
    importSession,
    open: (layer) => {
      depth.current += 1;
      window.history.pushState(
        { ...(window.history.state as object), hlbPhone: depth.current },
        '',
      );
      setNotice('');
      setLayers([...layersRef.current, layer]);
    },
    replaceTop: (layer) => {
      const current = layersRef.current;
      if (current.length > 0) {
        setLayers([...current.slice(0, -1), layer]);
      }
    },
    close: (count = 1, then) => {
      const steps = Math.min(count, depth.current);
      if (steps <= 0) {
        then?.();
        return;
      }
      pendingThen.current = then ?? null;
      window.history.go(-steps);
    },
    reset,
    setView: (next) => {
      setNotice('');
      setViewState(next);
    },
    setChart: (next) => {
      setNotice('');
      setChartState(next);
    },
    notify: setNotice,
    clearNotice: () => setNotice(''),
    setImportSession,
  };

  return (
    <PhoneUiContext.Provider value={value}>{children}</PhoneUiContext.Provider>
  );
}

/** The phone layout's state; only inside <PhoneUiProvider>. */
export function usePhoneUi(): PhoneUi {
  const ui = useContext(PhoneUiContext);
  if (!ui) {
    throw new Error('usePhoneUi must be used inside <PhoneUiProvider>');
  }
  return ui;
}
