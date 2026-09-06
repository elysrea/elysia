import { defineConfig } from 'vite';

import { htmlContent } from './plugins/html-content.ts';

/**
 * `BASE_PATH` lets the same build serve from a domain root or from a GitHub
 * Pages project subpath without editing anything in the source.
 */
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [htmlContent()],
  build: {
    target: 'es2022',
    cssTarget: 'safari16',
    modulePreload: { polyfill: false },
    reportCompressedSize: true,
  },
  server: { open: false },
});
