import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { initBenchValues } from '../src/features/bench.ts';
import { swatches } from '../src/content/bench.ts';

beforeEach(() => {
  document.documentElement.style.setProperty('--halo', '#e9ddff');
  document.documentElement.style.setProperty(
    '--font-display',
    "'Syne Variable', Arial, sans-serif",
  );
  document.documentElement.style.setProperty('--dur-fast', '0.35s');
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
});

describe('initBenchValues', () => {
  it('fills a slot with what the token currently resolves to', () => {
    document.body.innerHTML = '<span data-token="--halo"></span>';

    initBenchValues();

    expect(document.querySelector('[data-token]')?.textContent).toBe('#e9ddff');
  });

  it('shows only the family being demonstrated, not the whole stack', () => {
    document.body.innerHTML = '<span data-token="--font-display"></span>';

    initBenchValues();

    // A font stack is long and the first family is the one on screen.
    expect(document.querySelector('[data-token]')?.textContent).toBe('Syne Variable');
  });

  it('reads durations as written', () => {
    document.body.innerHTML = '<span data-token="--dur-fast"></span>';

    initBenchValues();

    expect(document.querySelector('[data-token]')?.textContent).toBe('0.35s');
  });

  it('leaves a slot empty rather than printing nothing useful', () => {
    document.body.innerHTML = '<span data-token="--not-a-token">untouched</span>';

    initBenchValues();

    expect(document.querySelector('[data-token]')?.textContent).toBe('untouched');
  });

  it('clears what it wrote on teardown', () => {
    document.body.innerHTML = '<span data-token="--halo"></span>';

    initBenchValues()();

    expect(document.querySelector('[data-token]')?.textContent).toBe('');
  });

  it('does nothing, safely, when there is no specimen', () => {
    expect(() => initBenchValues()()).not.toThrow();
  });

  it('names only tokens the stylesheet actually defines', () => {
    // The specimen documents the site; a token listed here that no longer
    // exists would render as a blank chip with a label.
    const tokens = readTokens();

    for (const swatch of swatches) {
      expect(tokens, swatch.token).toContain(swatch.token);
    }
  });
});

function readTokens(): string[] {
  const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');
  return [...css.matchAll(/(--[a-z0-9-]+):/g)].map((match) => match[1] ?? '');
}
