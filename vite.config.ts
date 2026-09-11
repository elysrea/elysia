import { defineConfig } from 'vite';

import { htmlContent } from './plugins/html-content.ts';

/**
 * `BASE_PATH` lets the same build serve from a domain root or from a subpath
 * without editing anything in the source.
 */
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  // Where the site is actually served, for canonical links, the sitemap and
  // link previews. Unset, it falls back to the studio's own fictional domain.
  plugins: [htmlContent(process.env.SITE_URL ? { origin: process.env.SITE_URL } : {})],
  build: {
    target: 'es2022',
    cssTarget: 'safari16',
    modulePreload: { polyfill: false },
    reportCompressedSize: true,
  },
  // `npm run dev` is how everyone meets this project, so it opens the page
  // rather than leaving a URL in the terminal for them to find.
  server: { open: true },
});
