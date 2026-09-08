import { queryAll } from '../lib/dom.ts';

/**
 * Fills the specimen in from the live cascade.
 *
 * The bench documents the site's own tokens, and a specimen that repeats values
 * written down somewhere else is a specimen that will eventually be wrong. Each
 * slot names a custom property and this reads what that property currently
 * resolves to, so changing a token changes the documentation with it.
 *
 * Returns a teardown function, which puts the slots back the way it found them.
 */
export function initBenchValues(scope: ParentNode = document): () => void {
  const slots = queryAll<HTMLElement>('[data-token]', scope);
  if (slots.length === 0) return () => {};

  const root = document.documentElement;
  const computed = getComputedStyle(root);

  for (const slot of slots) {
    const token = slot.dataset.token;
    if (!token) continue;

    const value = computed.getPropertyValue(token).trim();
    if (value === '') continue;

    // Font stacks are long and the first family is the one being shown.
    slot.textContent = token.startsWith('--font')
      ? (value.split(',')[0] ?? value).replace(/['"]/g, '')
      : value;
  }

  return () => {
    for (const slot of slots) slot.textContent = '';
  };
}
