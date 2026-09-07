import { queryAll } from '../../lib/dom.ts';
import { createScene } from './index.ts';
import type { SceneHost } from './host.ts';

export interface HeroSwitcherOptions {
  readonly seed?: number;
  /** Called after a successful switch, for anything else that cares. */
  readonly onChange?: (name: string) => void;
}

/**
 * Turns the tabs in the seam into a hero switcher.
 *
 * The tabs are real links to `?hero=…` and work with JavaScript off — the page
 * is rendered from the query string either way. What this adds is not the
 * ability to switch but the ability to switch *without a reload*, which is the
 * whole point when the thing being compared is an animation.
 *
 * Returns a teardown function.
 */
export function initHeroSwitcher(
  host: SceneHost,
  container: Element,
  options: HeroSwitcherOptions = {},
): () => void {
  const tabs = queryAll<HTMLAnchorElement>('[data-hero]', container);
  if (tabs.length === 0) return () => {};

  const select = (name: string): void => {
    for (const tab of tabs) {
      if (tab.dataset.hero === name) tab.setAttribute('aria-current', 'true');
      else tab.removeAttribute('aria-current');
    }

    document.documentElement.setAttribute('data-hero', name);
    options.onChange?.(name);
  };

  const onClick = (event: MouseEvent): void => {
    // Leave the modified clicks alone: a middle click or cmd-click means the
    // visitor wants a new tab, and this link genuinely opens one.
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.currentTarget;
    if (!(target instanceof HTMLAnchorElement)) return;

    const name = target.dataset.hero;
    if (!name) return;

    event.preventDefault();
    host.setScene(createScene(name, options.seed));
    select(name);

    // Replace rather than push: this is a preference, not a place. It keeps
    // the choice shareable without filling the back button with hero names.
    window.history.replaceState(null, '', target.href);
  };

  for (const tab of tabs) tab.addEventListener('click', onClick);

  return () => {
    for (const tab of tabs) tab.removeEventListener('click', onClick);
  };
}
