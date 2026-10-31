import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PHONE_QUERY, useIsPhone } from '@/app/ui/phone/use-is-phone';

type Listener = () => void;

function mockMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<Listener>();
  const query = {
    get matches() {
      return matches;
    },
    addEventListener: vi.fn((_: string, listener: Listener) =>
      listeners.add(listener),
    ),
    removeEventListener: vi.fn((_: string, listener: Listener) =>
      listeners.delete(listener),
    ),
  };
  window.matchMedia = vi.fn(() => query as unknown as MediaQueryList);
  return {
    query,
    set(next: boolean) {
      matches = next;
      listeners.forEach((listener) => listener());
    },
    listeners,
  };
}

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia');
});

describe('useIsPhone', () => {
  it('is unknown (null) while rendering on the server', () => {
    mockMatchMedia(true);
    function Probe() {
      return createElement('span', null, String(useIsPhone()));
    }
    expect(renderToString(createElement(Probe))).toContain('null');
  });

  it('follows the 640px media query and its changes', () => {
    const media = mockMatchMedia(true);
    const { result, unmount } = renderHook(() => useIsPhone());
    expect(window.matchMedia).toHaveBeenCalledWith(PHONE_QUERY);
    expect(result.current).toBe(true);
    act(() => media.set(false));
    expect(result.current).toBe(false);
    unmount();
    expect(media.listeners.size).toBe(0);
  });
});
