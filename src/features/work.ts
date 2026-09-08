import { queryAll } from '../lib/dom.ts';

/**
 * Gives an open case study a URL.
 *
 * The rows are native `<details>`, so they open and close without any of this.
 * What this adds is that an open one is addressable: the hash follows it, a
 * link to `#work-meridian` arrives with that study open, and Back closes it
 * again. A case study someone cannot link to is a case study they cannot send
 * to a colleague, which is most of the point of publishing one.
 *
 * Returns a teardown function.
 */
export function initWorkDeepLinks(scope: ParentNode = document): () => void {
  const items = queryAll<HTMLDetailsElement>('details.work-item[id]', scope);
  if (items.length === 0) return () => {};

  const find = (hash: string): HTMLDetailsElement | undefined =>
    items.find((item) => `#${item.id}` === hash);

  /** True while the code is opening something, so its toggle is not echoed. */
  let syncing = false;

  const openFromHash = (): void => {
    const target = find(window.location.hash);
    syncing = true;

    for (const item of items) item.open = item === target;

    syncing = false;
  };

  const onToggle = (event: Event): void => {
    if (syncing) return;

    const item = event.currentTarget;
    if (!(item instanceof HTMLDetailsElement)) return;

    // `<details name>` closes its siblings for us, and each fires its own
    // toggle. Only the one that opened should write to the URL.
    if (item.open) {
      window.history.replaceState(null, '', `#${item.id}`);
    } else if (window.location.hash === `#${item.id}`) {
      // Strip the hash without reloading or jumping the page.
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  for (const item of items) item.addEventListener('toggle', onToggle);
  window.addEventListener('hashchange', openFromHash);

  // A link into a case study should arrive with it open.
  if (window.location.hash) openFromHash();

  return () => {
    for (const item of items) item.removeEventListener('toggle', onToggle);
    window.removeEventListener('hashchange', openFromHash);
  };
}
