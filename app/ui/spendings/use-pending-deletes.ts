'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActionResult } from '@/app/lib/actions';
import { FLUSH_DELETES_EVENT } from '@/app/lib/pending-deletes';

/** How long a removed entry waits before it is deleted (specs/010 FR-010). */
export const UNDO_MS = 5000;

/** `waiting`: the undo time is running. `sending`: the delete has been sent. */
export type PendingPhase = 'waiting' | 'sending';

type Callbacks = {
  onDelete: (id: string) => Promise<ActionResult>;
  /** Deleted, or already gone (FR-015). */
  onDeleted: (id: string) => void;
  onError: (id: string, message: string) => void;
  onSignedOut: () => void;
};

/**
 * Removed entries waiting out their undo time (specs/010 US2, data-model.md "Pending delete").
 * Each id has its own timer, is sent at most once (FR-017), and can be undone only while waiting.
 * Unmounting (another month, year or tab) and the flush event send every waiting id at once; a
 * page unload sends nothing, so those entries are kept (FR-018).
 */
export function usePendingDeletes(callbacks: Callbacks) {
  const [phases, setPhases] = useState<ReadonlyMap<string, PendingPhase>>(
    () => new Map(),
  );
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const sent = useRef(new Set<string>());
  const latest = useRef(callbacks);
  useEffect(() => {
    latest.current = callbacks;
  });

  const setPhase = useCallback((id: string, phase: PendingPhase | null) => {
    setPhases((current) => {
      const next = new Map(current);
      if (phase) {
        next.set(id, phase);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const send = useCallback(
    (id: string) => {
      clearTimeout(timers.current.get(id));
      timers.current.delete(id);
      if (sent.current.has(id)) {
        return;
      }
      sent.current.add(id);
      setPhase(id, 'sending');
      void latest.current.onDelete(id).then((result) => {
        if (
          result.status === 'ok' ||
          (result.status === 'error' && result.gone)
        ) {
          // Stays faded until the refreshed list drops the row (settle).
          latest.current.onDeleted(id);
        } else if (result.status === 'signed-out') {
          latest.current.onSignedOut();
        } else {
          sent.current.delete(id);
          setPhase(id, null);
          latest.current.onError(id, result.message);
        }
      });
    },
    [setPhase],
  );

  const start = useCallback(
    (id: string) => {
      if (timers.current.has(id) || sent.current.has(id)) {
        return;
      }
      timers.current.set(
        id,
        setTimeout(() => send(id), UNDO_MS),
      );
      setPhase(id, 'waiting');
    },
    [send, setPhase],
  );

  const undo = useCallback(
    (id: string) => {
      const timer = timers.current.get(id);
      if (timer === undefined) {
        return;
      }
      clearTimeout(timer);
      timers.current.delete(id);
      setPhase(id, null);
    },
    [setPhase],
  );

  const flushAll = useCallback(() => {
    for (const id of [...timers.current.keys()]) {
      send(id);
    }
  }, [send]);

  /** Drops ids the list no longer shows: deleted here, or elsewhere. */
  const settle = useCallback((listed: readonly string[]) => {
    const shown = new Set(listed);
    setPhases((current) => {
      const gone = [...current.keys()].filter((id) => !shown.has(id));
      if (gone.length === 0) {
        return current;
      }
      const next = new Map(current);
      for (const id of gone) {
        clearTimeout(timers.current.get(id));
        timers.current.delete(id);
        next.delete(id);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    window.addEventListener(FLUSH_DELETES_EVENT, flushAll);
    return () => window.removeEventListener(FLUSH_DELETES_EVENT, flushAll);
  }, [flushAll]);

  // Flush on a real unmount only: Strict Mode's simulated unmount re-runs this effect at once,
  // which cancels the deferred flush.
  const leaving = useRef(false);
  useEffect(() => {
    leaving.current = false;
    return () => {
      leaving.current = true;
      queueMicrotask(() => {
        if (leaving.current) {
          flushAll();
        }
      });
    };
  }, [flushAll]);

  const phaseOf = useCallback((id: string) => phases.get(id), [phases]);

  return { phaseOf, start, undo, flushAll, settle };
}
