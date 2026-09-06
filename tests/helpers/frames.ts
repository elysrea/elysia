import { vi } from 'vitest';

/** A manually advanced requestAnimationFrame clock. */
export interface FrameClock {
  /** Runs one frame, advancing the clock by `deltaMs`. */
  tick(deltaMs?: number): void;
  readonly pending: number;
  readonly cancelled: number;
  restore(): void;
}

export function installFrameClock(): FrameClock {
  let now = 0;
  let nextHandle = 1;
  let cancelled = 0;
  const queue = new Map<number, FrameRequestCallback>();

  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
    const handle = nextHandle++;
    queue.set(handle, callback);
    return handle;
  });

  vi.stubGlobal('cancelAnimationFrame', (handle: number): void => {
    if (queue.delete(handle)) cancelled++;
  });

  vi.stubGlobal('performance', { now: () => now });

  return {
    tick(deltaMs = 1000 / 60) {
      now += deltaMs;
      const due = [...queue.entries()];
      queue.clear();
      for (const [, callback] of due) callback(now);
    },
    get pending() {
      return queue.size;
    },
    get cancelled() {
      return cancelled;
    },
    restore() {
      vi.unstubAllGlobals();
    },
  };
}
