import { afterEach, describe, expect, it, vi } from 'vitest';

import { onReducedMotionChange, prefersReducedMotion } from '../src/lib/motion.ts';

type Listener = (event: MediaQueryListEvent) => void;

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<Listener>();

  const list = {
    matches,
    addEventListener: vi.fn((_: string, listener: Listener) => listeners.add(listener)),
    removeEventListener: vi.fn((_: string, listener: Listener) => listeners.delete(listener)),
  };

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => list),
  );

  return {
    list,
    emit(next: boolean) {
      for (const listener of listeners) listener({ matches: next } as MediaQueryListEvent);
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('prefersReducedMotion', () => {
  it('reflects the media query', () => {
    stubMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);

    stubMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('assumes motion is fine where matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('onReducedMotionChange', () => {
  it('reports a change made while the page is open', () => {
    const media = stubMatchMedia(false);
    const handler = vi.fn();

    onReducedMotionChange(handler);
    media.emit(true);

    expect(handler).toHaveBeenCalledWith(true);
  });

  it('unsubscribes', () => {
    const media = stubMatchMedia(false);
    const handler = vi.fn();

    onReducedMotionChange(handler)();
    media.emit(true);

    expect(media.listenerCount).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it('is safe where matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(() => onReducedMotionChange(vi.fn())()).not.toThrow();
  });
});
