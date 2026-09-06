import { queryAll } from '../lib/dom.ts';
import { prefersReducedMotion } from '../lib/motion.ts';

export interface RevealOptions {
  readonly selector?: string;
  readonly rootMargin?: string;
  readonly threshold?: number;
}

/**
 * Fades sections in as they are reached.
 *
 * Elements are unobserved once revealed — the observer should not keep paying
 * attention to content that has already finished its one transition. If motion
 * is reduced, everything is simply marked visible and no observer is created.
 *
 * Returns a teardown function.
 */
export function initReveal(options: RevealOptions = {}): () => void {
  const elements = queryAll<HTMLElement>(options.selector ?? '.reveal');
  if (elements.length === 0) return () => {};

  if (prefersReducedMotion()) {
    for (const element of elements) element.classList.add('is-in');
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    },
    {
      rootMargin: options.rootMargin ?? '0px 0px -12% 0px',
      threshold: options.threshold ?? 0.12,
    },
  );

  for (const element of elements) observer.observe(element);
  return () => observer.disconnect();
}
