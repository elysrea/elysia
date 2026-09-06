import { describe, expect, it } from 'vitest';

import { htmlContent } from '../plugins/html-content.ts';

/** Calls the plugin's transformIndexHtml hook the way Vite would. */
function transform(html: string): string {
  const plugin = htmlContent({ origin: 'https://example.test' });
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
});
