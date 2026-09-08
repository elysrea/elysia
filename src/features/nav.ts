import { queryAll } from '../lib/dom.ts';

export interface NavOptions {
  /** Distance scrolled before the bar takes on its background, in pixels. */
  readonly stuckAfter?: number;
}

/**
 * Sticky state and scrollspy for the header.
 *
 * Both use IntersectionObserver rather than a scroll handler: a scroll listener
 * fires on every wheel tick and has to be throttled by hand, while the observer
 * only wakes the main thread when the answer actually changes.
 *
 * Returns a teardown function.
 */
export function initNav(nav: HTMLElement, options: NavOptions = {}): () => void {
  const teardown: (() => void)[] = [];

  // A zero-cost sentinel at the top of the page stands in for "scrollY > n".
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  Object.assign(sentinel.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '1px',
    height: `${options.stuckAfter ?? 40}px`,
    pointerEvents: 'none',
  });
  document.body.prepend(sentinel);

  const stuckObserver = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (entry) nav.classList.toggle('is-stuck', !entry.isIntersecting);
  });
  stuckObserver.observe(sentinel);

  teardown.push(() => {
    stuckObserver.disconnect();
    sentinel.remove();
  });

  // --- scrollspy ---------------------------------------------------------

  const links = queryAll<HTMLAnchorElement>('.nav-links a', nav).filter((link) =>
    link.hash.startsWith('#'),
  );

  const sections = new Map<Element, HTMLAnchorElement>();
  for (const link of links) {
    const section = document.querySelector(link.hash);
    if (section) sections.set(section, link);
  }

  if (sections.size > 0) {
    const active = new Set<Element>();

    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) active.add(entry.target);
          else active.delete(entry.target);
        }

        // With a narrow root margin at most one section qualifies, but keep
        // document order as the tie-break so the result is never arbitrary.
        const current = [...sections.keys()].find((section) => active.has(section));

        for (const [section, link] of sections) {
          if (section === current) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        }
      },
      // Only the band across the middle of the viewport counts as "reading".
      { rootMargin: '-45% 0px -50% 0px' },
    );

    for (const section of sections.keys()) spy.observe(section);
    teardown.push(() => spy.disconnect());
  }

  return () => {
    for (const off of teardown) off();
  };
}
