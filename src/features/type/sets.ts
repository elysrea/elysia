/**
 * The type systems, as data.
 *
 * Like the hero catalogue this module imports nothing: the build-time renderer
 * needs the names to write them into the inline script that applies the set
 * before first paint, and that script cannot wait for a module to load.
 *
 * The default set is the one declared on bare `:root` in `tokens.css`, so it
 * needs no attribute and no script at all.
 */
export interface TypeSet {
  readonly name: string;
  readonly label: string;
  readonly blurb: string;
}

export const TYPE_SETS: readonly TypeSet[] = [
  { name: 'grotesk', label: 'Grotesk', blurb: 'Syne for display, Inter for reading' },
  { name: 'serif', label: 'Serif', blurb: 'Instrument Serif for display' },
  { name: 'mono', label: 'Mono', blurb: 'IBM Plex Mono all the way up' },
];

export const DEFAULT_TYPE = 'grotesk';

export const typeNames: readonly string[] = TYPE_SETS.map((set) => set.name);

/** Picks a set from `?type=`, falling back to the default for anything else. */
export function resolveTypeSet(search: string): string {
  const requested = new URLSearchParams(search).get('type');
  return requested && typeNames.includes(requested) ? requested : DEFAULT_TYPE;
}
