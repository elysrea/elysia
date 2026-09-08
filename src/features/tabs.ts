import { queryAll } from '../lib/dom.ts';

/**
 * A tab group.
 *
 * The markup is a strip of links and a panel per link, both of which are on the
 * page and readable before this runs — the links are ordinary anchors to the
 * panels. What this adds is showing one panel at a time and the tab semantics
 * that go with it: `aria-selected`, a labelled `tabpanel`, one tab stop for the
 * whole strip, and arrow keys inside it.
 *
 * Returns a teardown function.
 */
export interface TabsOptions {
  /** Called with the panel name whenever the selection changes. */
  readonly onSelect?: (name: string) => void;
  /** Prefix for the generated tab ids, so two groups cannot collide. */
  readonly idPrefix?: string;
}

export function initTabs(root: Element, options: TabsOptions = {}): () => void {
  const strip = root.querySelector('[data-tablist]');
  if (!strip) return () => {};

  const tabs = queryAll<HTMLAnchorElement>('[data-tab]', strip);
  if (tabs.length === 0) return () => {};

  const prefix = options.idPrefix ?? 'tab';
  const names = tabs.map((tab) => tab.dataset.tab ?? '').filter(Boolean);
  const panels = new Map<string, HTMLElement>();

  for (const name of names) {
    const panel = root.querySelector<HTMLElement>(`[data-panel="${name}"]`);
    if (panel) panels.set(name, panel);
  }
  if (panels.size === 0) return () => {};

  strip.setAttribute('role', 'tablist');
  root.setAttribute('data-tabs', 'on');

  let active = names[0] ?? '';

  const show = (name: string, moveFocus = false): void => {
    if (!panels.has(name)) return;
    active = name;

    for (const tab of tabs) {
      const selected = tab.dataset.tab === name;
      tab.id = `${prefix}-${tab.dataset.tab ?? ''}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(selected));
      // Roving tabindex: one stop for the strip, arrows move within it.
      tab.tabIndex = selected ? 0 : -1;
      if (moveFocus && selected) tab.focus();
    }

    for (const [panelName, panel] of panels) {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `${prefix}-${panelName}`);
      panel.hidden = panelName !== name;
    }

    options.onSelect?.(name);
  };

  const onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const tab = event.currentTarget;
    if (!(tab instanceof HTMLAnchorElement)) return;

    const name = tab.dataset.tab;
    if (!name || !panels.has(name)) return;

    // Following the link would scroll to a panel already in front of the
    // reader. Switching in place is the point of a tab.
    event.preventDefault();
    show(name);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const step = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity }[event.key];
    if (step === undefined) return;

    const index = names.indexOf(active);
    const next =
      step === -Infinity
        ? 0
        : step === Infinity
          ? names.length - 1
          : (index + step + names.length) % names.length;

    const name = names[next];
    if (!name) return;

    event.preventDefault();
    show(name, true);
  };

  for (const tab of tabs) {
    tab.addEventListener('click', onClick);
    tab.addEventListener('keydown', onKeyDown);
  }

  show(names[0] ?? '');

  return () => {
    for (const tab of tabs) {
      tab.removeEventListener('click', onClick);
      tab.removeEventListener('keydown', onKeyDown);
    }
    root.removeAttribute('data-tabs');
    for (const panel of panels.values()) panel.hidden = false;
  };
}
