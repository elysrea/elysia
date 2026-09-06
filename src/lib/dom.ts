/** Small typed wrappers so feature code never sprinkles non-null assertions. */

export function query<E extends Element>(selector: string, scope: ParentNode = document): E | null {
  return scope.querySelector<E>(selector);
}

export function queryAll<E extends Element>(selector: string, scope: ParentNode = document): E[] {
  return Array.from(scope.querySelectorAll<E>(selector));
}

/**
 * Reads a CSS custom property as a fraction.
 *
 * The horizon exists once, in `tokens.css`. Rather than restating its
 * breakpoints in JavaScript (where they drift), the canvas asks the cascade
 * what the current value is.
 */
export function readRatioToken(element: Element, property: string, fallback: number): number {
  const raw = getComputedStyle(element).getPropertyValue(property).trim();
  if (raw === '') return fallback;

  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return fallback;

  return raw.endsWith('%') ? value / 100 : value;
}
