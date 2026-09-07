/**
 * Re-vendors the two latin font subsets the site actually uses.
 *
 * The site self-hosts fonts (no third-party request on first paint, no CLS from
 * a late stylesheet), but the upstream packages stay in devDependencies so the
 * files can be refreshed deterministically instead of being mystery binaries.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'src/assets/fonts');

const files = [
  [
    '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2',
    'instrument-serif-latin-400.woff2',
  ],
  ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'inter-latin-variable.woff2'],
  [
    '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
    'ibm-plex-mono-latin-400.woff2',
  ],
  ['@fontsource/instrument-serif/LICENSE', 'InstrumentSerif-OFL.txt'],
  ['@fontsource-variable/inter/LICENSE', 'Inter-OFL.txt'],
  ['@fontsource/ibm-plex-mono/LICENSE', 'IBMPlexMono-OFL.txt'],
];

mkdirSync(out, { recursive: true });
for (const [from, to] of files) {
  copyFileSync(resolve(root, 'node_modules', from), resolve(out, to));
  console.log(`fonts: ${to}`);
}
