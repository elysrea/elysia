import type { Plugin } from 'vite';

import { meta } from '../src/content/site.ts';
import { slots } from '../src/content/render.ts';

/** Matches `<!--@slot-name-->` placeholders in the HTML shell. */
const PLACEHOLDER = /<!--@([a-z-]+)-->/g;

export interface HtmlContentOptions {
  /** Absolute site origin used for canonical links and the sitemap. */
  readonly origin?: string;
}

/**
 * Renders the typed content model into `index.html` at build time.
 *
 * The alternative — shipping an empty shell and building the DOM in the
 * browser — costs a round trip before anything is readable and hides the copy
 * from crawlers. Doing it here keeps content typed and the output static.
 *
 * An unknown or unfilled placeholder fails the build rather than shipping a
 * page with a hole in it.
 */
/** Placeholders the plugin fills itself, from where the page is served. */
export const deploymentSlotNames: readonly string[] = ['site-url'];

export function htmlContent(options: HtmlContentOptions = {}): Plugin {
  const origin = (options.origin ?? meta.url).replace(/\/+$/, '');

  // Slots that depend on where the page is served rather than on the content.
  const deploymentSlots: Readonly<Record<string, () => string>> = {
    'site-url': () => `${origin}/`,
  };

  // Own properties only: a placeholder named `constructor` must not resolve
  // through the prototype chain to a function the renderer then calls.
  const lookup = (name: string): (() => string) | undefined => {
    if (Object.hasOwn(deploymentSlots, name)) return deploymentSlots[name];
    if (Object.hasOwn(slots, name)) return slots[name];
    return undefined;
  };

  return {
    name: 'elysia:html-content',
    enforce: 'pre',

    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const unknown: string[] = [];

        const rendered = html.replace(PLACEHOLDER, (_match, name: string) => {
          const slot = lookup(name);
          if (!slot) {
            unknown.push(name);
            return '';
          }
          return slot();
        });

        if (unknown.length > 0) {
          throw new Error(
            `[elysia:html-content] unknown content slot(s): ${unknown.join(', ')}. ` +
              `Known slots: ${[...Object.keys(deploymentSlots), ...Object.keys(slots)].join(', ')}.`,
          );
        }

        const leftover = PLACEHOLDER.exec(rendered);
        if (leftover) {
          throw new Error(`[elysia:html-content] placeholder survived rendering: ${leftover[0]}`);
        }

        return rendered;
      },
    },

    handleHotUpdate({ file, server }) {
      if (file.includes('/src/content/')) {
        server.hot.send({ type: 'full-reload' });
        return [];
      }
      return undefined;
    },

    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: [`User-agent: *`, `Allow: /`, ``, `Sitemap: ${origin}/sitemap.xml`, ``].join('\n'),
      });

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          `  <url>`,
          `    <loc>${origin}/</loc>`,
          `    <lastmod>${today}</lastmod>`,
          `  </url>`,
          `</urlset>`,
          ``,
        ].join('\n'),
      });
    },
  };
}
