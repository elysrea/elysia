import './styles/index.css';

import { initNav } from './features/nav.ts';
import { initReveal } from './features/reveal.ts';
import { initBenchValues } from './features/bench.ts';
import { initBrief } from './features/brief.ts';
import { initTabs } from './features/tabs.ts';
import { initWorkDeepLinks } from './features/work.ts';
import { query } from './lib/dom.ts';
import { SceneHost, createHero } from './features/hero/index.ts';

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

enhance('bench', () => {
  const deck = query('.deck');
  if (deck) initTabs(deck, { idPrefix: 'bench' });
  initBenchValues();
});

enhance('work', () => {
  initWorkDeepLinks();
});

enhance('brief', () => {
  const brief = query<HTMLElement>('[data-brief]');
  if (brief) initBrief(brief);
});

enhance('hero', () => {
  const canvas = query<HTMLCanvasElement>('#globe');
  if (!canvas) return;

  new SceneHost(canvas, createHero());
});
