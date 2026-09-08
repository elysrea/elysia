import { queryAll } from '../lib/dom.ts';

/**
 * Turns the seam tabs into tabs, and the sections below them into panels.
 *
 * Without script the page is four sections stacked in order and four links
 * pointing at them, which is a page. With script it becomes one panel at a
 * time — which is a different reading experience, not a better-decorated one,
 * so everything that used to depend on those sections scrolling past has to be
 * reconsidered rather than left running.
 *
 * Returns a teardown function.
 */
export interface DeckOptions {
  /** Header links that should be marked when their section is showing. */
  readonly navSelector?: string;
}

/**
 * Which section a hash refers to.
 *
 * `#work` is the Work panel. So is `#work-meridian`, because a case study lives
 * inside it — the deck selects the panel and the work feature opens the study,
 * and neither needs to know about the other.
 */
export function sectionForHash(hash: string, ids: readonly string[]): string | null {
  const value = hash.startsWith('#') ? hash.slice(1) : hash;
  if (value === '') return null;

  return ids.find((id) => value === id || value.startsWith(`${id}-`)) ?? null;
}

export function initDeckTabs(scope: ParentNode = document, options: DeckOptions = {}): () => void {
  const tabs = queryAll<HTMLAnchorElement>('.deck-tabs [data-section]', scope);
  if (tabs.length === 0) return () => {};

  const ids = tabs.map((tab) => tab.dataset.section ?? '').filter(Boolean);
  const panels = new Map<string, HTMLElement>();

  for (const id of ids) {
    const panel = document.getElementById(id);
    if (panel) panels.set(id, panel);
  }
  if (panels.size === 0) return () => {};

  const navLinks = queryAll<HTMLAnchorElement>(options.navSelector ?? '.nav-links a');
  const list = tabs[0]?.parentElement;

  list?.setAttribute('role', 'tablist');
  for (const tab of tabs) tab.setAttribute('role', 'tab');
  for (const [id, panel] of panels) {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `tab-${id}`);
  }

  // Tells the stylesheet that panels are being shown one at a time, so it can
  // stop laying them out as a stack.
  const deck = list?.closest('.deck');
  deck?.setAttribute('data-tabs', 'on');

  let active = ids[0] ?? '';

  const show = (id: string, moveFocus = false): void => {
    if (!panels.has(id)) return;
    active = id;

    for (const tab of tabs) {
      const selected = tab.dataset.section === id;
      tab.id = `tab-${tab.dataset.section ?? ''}`;
      tab.setAttribute('aria-selected', String(selected));
      // Roving tabindex: one stop for the whole strip, arrows move within it.
      tab.tabIndex = selected ? 0 : -1;
      if (selected) {
        tab.setAttribute('aria-current', 'true');
        if (moveFocus) tab.focus();
      } else {
        tab.removeAttribute('aria-current');
      }
    }

    for (const [panelId, panel] of panels) panel.hidden = panelId !== id;

    // The header points at the same sections, so it should agree with the deck.
    for (const link of navLinks) {
      if (link.hash === `#${id}`) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  };

  const select = (id: string, moveFocus = false): void => {
    if (!panels.has(id) || id === active) return;
    show(id, moveFocus);

    // The hash carries the choice, but a case study already in the hash is more
    // specific than the panel it lives in, so it is left alone.
    if (sectionForHash(window.location.hash, ids) !== id) {
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  const onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const tab = event.currentTarget;
    if (!(tab instanceof HTMLAnchorElement)) return;

    const id = tab.dataset.section;
    if (!id || !panels.has(id)) return;

    // Following the link would jump the page to a panel that is already in
    // front of the reader. Switching in place is the whole point.
    event.preventDefault();
    select(id);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const step = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity }[event.key];
    if (step === undefined) return;

    const index = ids.indexOf(active);
    const next =
      step === -Infinity
        ? 0
        : step === Infinity
          ? ids.length - 1
          : (index + step + ids.length) % ids.length;

    const id = ids[next];
    if (!id) return;

    event.preventDefault();
    select(id, true);
  };

  const onHashChange = (): void => {
    const id = sectionForHash(window.location.hash, ids);
    if (id) show(id);
  };

  for (const tab of tabs) {
    tab.addEventListener('click', onClick);
    tab.addEventListener('keydown', onKeyDown);
  }
  window.addEventListener('hashchange', onHashChange);

  show(sectionForHash(window.location.hash, ids) ?? ids[0] ?? '');

  return () => {
    for (const tab of tabs) {
      tab.removeEventListener('click', onClick);
      tab.removeEventListener('keydown', onKeyDown);
    }
    window.removeEventListener('hashchange', onHashChange);
    deck?.removeAttribute('data-tabs');
    for (const panel of panels.values()) panel.hidden = false;
  };
}
