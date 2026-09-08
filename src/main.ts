import './styles/index.css';

import { initNav } from './features/nav.ts';
import { initReveal } from './features/reveal.ts';
import { initWorkDeepLinks } from './features/work.ts';
import { query } from './lib/dom.ts';
import { SceneHost, initHeroSwitcher, resolveScene } from './features/hero/index.ts';

/**
 * Entry point.
 *
 * Every enhancement is optional and independently guarded: the page is complete
 * static HTML, so a feature that throws — an unsupported API, a canvas the
 * browser refuses to allocate — must not take the rest of the page with it.
 */
function enhance(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`[elysia] ${name} failed to initialise`, error);
  }
}

enhance('nav', () => {
  const nav = query<HTMLElement>('#nav');
  if (nav) initNav(nav);
});

enhance('reveal', () => {
  initReveal();
});

enhance('work', () => {
  initWorkDeepLinks();
});

enhance('hero', () => {
  const canvas = query<HTMLCanvasElement>('#globe');
  if (!canvas) return;

  const { name, scene } = resolveScene(window.location.search);
  document.documentElement.setAttribute('data-hero', name);

  const host = new SceneHost(canvas, scene);
  const tabs = query('.deck-tabs');
  if (tabs) initHeroSwitcher(host, tabs);
});
