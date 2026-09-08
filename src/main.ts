import './styles/index.css';

import { initNav } from './features/nav.ts';
import { initReveal } from './features/reveal.ts';
import { initDeckTabs } from './features/deck.ts';
import { initWorkDeepLinks } from './features/work.ts';
import { query } from './lib/dom.ts';
import { SceneHost, resolveScene } from './features/hero/index.ts';

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

// The deck runs before the work feature: a link to a case study has to land on
// a panel that is already showing before the study inside it is opened.
enhance('deck', () => {
  initDeckTabs();
});

enhance('work', () => {
  initWorkDeepLinks();
});

enhance('hero', () => {
  const canvas = query<HTMLCanvasElement>('#globe');
  if (!canvas) return;

  const { name, scene } = resolveScene(window.location.search);
  document.documentElement.setAttribute('data-hero', name);

  new SceneHost(canvas, scene);
});
