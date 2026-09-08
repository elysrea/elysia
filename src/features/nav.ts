export interface NavOptions {
  /** Distance scrolled before the bar takes on its background, in pixels. */
  readonly stuckAfter?: number;
}

/**
 * Sticky state for the header.
 *
 * It uses IntersectionObserver on a sentinel rather than a scroll handler: a
 * scroll listener fires on every wheel tick and has to be throttled by hand,
 * while the observer only wakes the main thread when the answer changes.
 *
 * Marking the current section used to live here as a scrollspy. The deck shows
 * one section at a time now, so which one is current is a fact the deck knows
 * and no longer something to infer from scroll position.
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

  return () => {
    for (const off of teardown) off();
  };
}
