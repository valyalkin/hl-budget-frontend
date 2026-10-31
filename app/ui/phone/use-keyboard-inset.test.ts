import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useKeyboardInset } from '@/app/ui/phone/use-keyboard-inset';

class FakeViewport extends EventTarget {
  height = 800;
  offsetTop = 0;
}

afterEach(() => {
  Reflect.deleteProperty(window, 'visualViewport');
});

describe('useKeyboardInset', () => {
  it('tracks the part of the page the keyboard covers, and cleans up', () => {
    const viewport = new FakeViewport();
    Object.defineProperty(window, 'visualViewport', {
      value: viewport,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
    });
    const root = document.documentElement;
    const { unmount } = renderHook(() => useKeyboardInset());
    expect(root.style.getPropertyValue('--keyboard-inset')).toBe('0px');
    act(() => {
      viewport.height = 480;
      viewport.dispatchEvent(new Event('resize'));
    });
    expect(root.style.getPropertyValue('--keyboard-inset')).toBe('320px');
    unmount();
    expect(root.style.getPropertyValue('--keyboard-inset')).toBe('');
  });
});
