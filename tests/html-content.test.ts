import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { deploymentSlotNames, htmlContent } from '../plugins/html-content.ts';

/** Calls the plugin's transformIndexHtml hook the way Vite would. */
function transform(html: string, origin = 'https://example.test'): string {
  const plugin = htmlContent({ origin });
  const hook = plugin.transformIndexHtml;
  if (typeof hook !== 'object' || typeof hook.handler !== 'function') {
    throw new Error('expected an object hook with a handler');
  }

  const result = hook.handler.call(
    // The hook only reads the HTML argument.
    null as never,
    html,
    null as never,
  );

  if (typeof result !== 'string') throw new Error('expected a string result');
  return result;
}

describe('htmlContent plugin', () => {
  it('fills a known slot', () => {
    expect(transform('<h1><!--@site-name--></h1>')).toBe('<h1>Elysia</h1>');
  });

  it('fails the build on an unknown slot rather than shipping a hole', () => {
    expect(() => transform('<p><!--@nope--></p>')).toThrow(/unknown content slot/);
  });

  it('leaves markup without slots untouched', () => {
    const html = '<main><p>Plain</p></main>';

    expect(transform(html)).toBe(html);
  });

  it('fills every slot in a document, not just the first', () => {
    const out = transform('<a><!--@site-name--></a><b><!--@site-name--></b>');

    expect(out).toBe('<a>Elysia</a><b>Elysia</b>');
  });

  it('points site-url at the address the page is served from', () => {
    expect(transform('<link href="<!--@site-url-->">')).toBe('<link href="https://example.test/">');
  });

  it('does not double the slash when the origin already ends in one', () => {
    expect(transform('<!--@site-url-->og.jpg', 'https://example.test/sub/')).toBe(
      'https://example.test/sub/og.jpg',
    );
  });

  it('does not resolve a placeholder through the prototype chain', () => {
    expect(() => transform('<!--@constructor-->')).toThrow(/unknown content slot/);
  });

  it('fills every placeholder it says it owns', () => {
    for (const name of deploymentSlotNames) {
      expect(transform(`<!--@${name}-->`), name).not.toBe('');
    }
  });

  it('renders the real shell end to end, leaving no placeholder behind', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const out = transform(html);

    expect(out).not.toMatch(/<!--@[a-z-]+-->/);
    expect(out).toContain('<link rel="canonical" href="https://example.test/" />');
  });
});
