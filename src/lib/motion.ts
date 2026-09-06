const QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia(QUERY).matches;
}

/**
 * Subscribes to changes in the preference. The setting can be toggled while
 * the page is open, and an effect that only reads it once gets it wrong.
 * Returns an unsubscribe function.
 */
export function onReducedMotionChange(handler: (reduced: boolean) => void): () => void {
  if (typeof matchMedia !== 'function') return () => {};

  const list = matchMedia(QUERY);
  const listener = (event: MediaQueryListEvent): void => {
    handler(event.matches);
  };

  list.addEventListener('change', listener);
  return () => {
    list.removeEventListener('change', listener);
  };
}
