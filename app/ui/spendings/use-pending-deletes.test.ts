import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@/app/lib/actions';
import { flushPendingDeletes } from '@/app/lib/pending-deletes';
import {
  UNDO_MS,
  usePendingDeletes,
} from '@/app/ui/spendings/use-pending-deletes';

function setup(
  result: ActionResult = { status: 'ok' },
  options: { strict?: boolean } = {},
) {
  const callbacks = {
    onDelete: vi.fn(() => Promise.resolve(result)),
    onDeleted: vi.fn(),
    onError: vi.fn(),
    onSignedOut: vi.fn(),
  };
  const view = renderHook(() => usePendingDeletes(callbacks), {
    wrapper: options.strict ? StrictMode : undefined,
  });
  return { ...callbacks, ...view };
}

/** Advances fake time and lets the delete's promise settle. */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePendingDeletes (specs/010 US2)', () => {
  it('waits 5 seconds, then sends the delete once', async () => {
    const { result, onDelete, onDeleted } = setup();
    expect(UNDO_MS).toBe(5000);
    act(() => result.current.start('a'));
    expect(result.current.phaseOf('a')).toBe('waiting');

    await advance(4999);
    expect(onDelete).not.toHaveBeenCalled();

    await advance(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('a');
    expect(result.current.phaseOf('a')).toBe('sending');
    expect(onDeleted).toHaveBeenCalledWith('a');

    await advance(20_000);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('undo while waiting cancels; nothing is ever sent', async () => {
    const { result, onDelete } = setup();
    act(() => result.current.start('a'));
    await advance(3000);
    act(() => result.current.undo('a'));
    expect(result.current.phaseOf('a')).toBeUndefined();
    await advance(10_000);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('undo while sending does nothing; start on a pending id is ignored', async () => {
    const { result, onDelete } = setup();
    act(() => result.current.start('a'));
    await advance(2000);
    act(() => result.current.start('a')); // does not restart the 5 seconds
    await advance(3000);
    expect(onDelete).toHaveBeenCalledTimes(1);
    act(() => result.current.undo('a'));
    expect(result.current.phaseOf('a')).toBe('sending');
  });

  it('each id has its own 5 seconds', async () => {
    const { result, onDelete } = setup();
    act(() => result.current.start('a'));
    await advance(1000);
    act(() => result.current.start('b'));
    await advance(4000);
    expect(onDelete.mock.calls).toEqual([['a']]);
    await advance(1000);
    expect(onDelete.mock.calls).toEqual([['a'], ['b']]);
  });

  it('flushAll sends every waiting id at once, and never again later', async () => {
    const { result, onDelete } = setup();
    act(() => {
      result.current.start('a');
      result.current.start('b');
    });
    await act(async () => {
      result.current.flushAll();
      await Promise.resolve();
    });
    expect(onDelete.mock.calls).toEqual([['a'], ['b']]);
    await advance(10_000);
    expect(onDelete).toHaveBeenCalledTimes(2);
  });

  it('the flush event sends waiting ids', async () => {
    const { result, onDelete } = setup();
    act(() => result.current.start('a'));
    await act(async () => {
      flushPendingDeletes();
      await Promise.resolve();
    });
    expect(onDelete).toHaveBeenCalledWith('a');
  });

  it('unmounting sends waiting ids', async () => {
    const { result, onDelete, unmount } = setup();
    act(() => result.current.start('a'));
    unmount();
    await advance(0);
    expect(onDelete).toHaveBeenCalledWith('a');
  });

  it('Strict Mode’s simulated remount sends nothing early and nothing twice', async () => {
    const { result, onDelete } = setup({ status: 'ok' }, { strict: true });
    act(() => result.current.start('a'));
    await advance(4999);
    expect(onDelete).not.toHaveBeenCalled();
    await advance(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('a failed delete drops the id and reports the message', async () => {
    const { result, onError, onDeleted } = setup({
      status: 'error',
      message: 'Not deleted.',
    });
    act(() => result.current.start('a'));
    await advance(UNDO_MS);
    expect(result.current.phaseOf('a')).toBeUndefined();
    expect(onError).toHaveBeenCalledWith('a', 'Not deleted.');
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('an entry already gone counts as deleted', async () => {
    const { result, onError, onDeleted } = setup({
      status: 'error',
      message: 'Gone.',
      gone: true,
    });
    act(() => result.current.start('a'));
    await advance(UNDO_MS);
    expect(onError).not.toHaveBeenCalled();
    expect(onDeleted).toHaveBeenCalledWith('a');
  });

  it('a lost session is reported', async () => {
    const { result, onSignedOut } = setup({ status: 'signed-out' });
    act(() => result.current.start('a'));
    await advance(UNDO_MS);
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });

  it('settle drops ids no longer listed, and their timers', async () => {
    const { result, onDelete } = setup();
    act(() => {
      result.current.start('a');
      result.current.start('b');
    });
    act(() => result.current.settle(['a']));
    expect(result.current.phaseOf('b')).toBeUndefined();
    expect(result.current.phaseOf('a')).toBe('waiting');
    await advance(UNDO_MS);
    expect(onDelete.mock.calls).toEqual([['a']]);
    act(() => result.current.settle([]));
    expect(result.current.phaseOf('a')).toBeUndefined();
  });
});
