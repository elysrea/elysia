import { vi } from 'vitest';

/**
 * A controllable IntersectionObserver stand-in.
 *
 * happy-dom does not implement the real thing, and the features under test are
 * built entirely around it, so the test drives intersection by hand.
 */
export interface FakeObserver {
  readonly options: IntersectionObserverInit | undefined;
  readonly targets: Set<Element>;
  emit(entries: { target: Element; isIntersecting: boolean }[]): void;
}

export interface ObserverHarness {
  readonly instances: FakeObserver[];
  restore(): void;
  /** The observer currently watching `target`, newest first. */
  observing(target: Element): FakeObserver | undefined;
}

export function installIntersectionObserver(): ObserverHarness {
  const instances: FakeObserver[] = [];
  const original = globalThis.IntersectionObserver;

  class MockIntersectionObserver implements FakeObserver {
    readonly targets = new Set<Element>();
    readonly options: IntersectionObserverInit | undefined;
    #callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.#callback = callback;
      this.options = options;
      instances.push(this);
    }

    observe(target: Element): void {
      this.targets.add(target);
    }

    unobserve(target: Element): void {
      this.targets.delete(target);
    }

    disconnect(): void {
      this.targets.clear();
    }

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }

    emit(entries: { target: Element; isIntersecting: boolean }[]): void {
      this.#callback(entries as unknown as IntersectionObserverEntry[], this as never);
    }
  }

  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

  return {
    instances,
    restore() {
      vi.stubGlobal('IntersectionObserver', original);
    },
    observing(target) {
      return [...instances].reverse().find((instance) => instance.targets.has(target));
    },
  };
}
