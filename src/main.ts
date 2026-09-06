import './styles/index.css';

import { initNav } from './features/nav.ts';
import { initReveal } from './features/reveal.ts';
import { query } from './lib/dom.ts';
import { WindField } from './features/wind/index.ts';

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

enhance('wind', () => {
  const canvas = query<HTMLCanvasElement>('#wind');
  if (canvas) new WindField(canvas);
});
