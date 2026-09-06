import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initReveal } from '../src/features/reveal.ts';
import {
  installIntersectionObserver,
  type ObserverHarness,
} from './helpers/intersection-observer.ts';

let harness: ObserverHarness;

const setMotionPreference = (reduced: boolean): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
};

beforeEach(() => {
  harness = installIntersectionObserver();
  document.body.innerHTML = '<div class="reveal" id="a"></div><div class="reveal" id="b"></div>';
  setMotionPreference(false);
});

afterEach(() => {
  harness.restore();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('initReveal', () => {
  const element = (id: string): HTMLElement => document.querySelector<HTMLElement>(`#${id}`)!;

  it('reveals elements as they come into view', () => {
    initReveal();
    const observer = harness.observing(element('a'))!;

    observer.emit([{ target: element('a'), isIntersecting: true }]);

    expect(element('a').classList.contains('is-in')).toBe(true);
    expect(element('b').classList.contains('is-in')).toBe(false);
  });

  it('stops watching an element once it has been revealed', () => {
    initReveal();
    const observer = harness.observing(element('a'))!;

    observer.emit([{ target: element('a'), isIntersecting: true }]);

    expect(observer.targets.has(element('a'))).toBe(false);
  });

  it('ignores elements that are merely scrolling past', () => {
    initReveal();
    const observer = harness.observing(element('a'))!;

    observer.emit([{ target: element('a'), isIntersecting: false }]);

    expect(element('a').classList.contains('is-in')).toBe(false);
  });

  it('shows everything at once when motion is reduced, with no observer at all', () => {
    setMotionPreference(true);
    initReveal();

    expect(element('a').classList.contains('is-in')).toBe(true);
    expect(element('b').classList.contains('is-in')).toBe(true);
    expect(harness.instances.length).toBe(0);
  });

  it('does nothing, safely, when there is nothing to reveal', () => {
    document.body.innerHTML = '';

    expect(() => initReveal()()).not.toThrow();
  });
});
