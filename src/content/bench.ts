/**
 * The bench: what the tabs in the seam show.
 *
 * It is a specimen of the system this page is built from — the same custom
 * properties, the same easings, the same components. The values are not written
 * down here; only the names are. What each one currently resolves to is read
 * from the live cascade at runtime, so the specimen cannot drift from the site
 * it documents.
 */
export interface BenchPanel {
  readonly name: string;
  readonly label: string;
  readonly caption: string;
}

export const benchPanels: readonly BenchPanel[] = [
  {
    name: 'palette',
    label: 'Palette',
    caption: 'One hue held across values, and a single warm note.',
  },
  {
    name: 'type',
    label: 'Type',
    caption: 'Three faces with one job each. Nothing set in capitals.',
  },
  { name: 'motion', label: 'Motion', caption: 'Two easings and three durations, used everywhere.' },
  {
    name: 'parts',
    label: 'Parts',
    caption: 'The whole component set, live rather than screenshotted.',
  },
];

export interface Swatch {
  readonly token: string;
  readonly label: string;
}

export const swatches: readonly Swatch[] = [
  { token: '--void', label: 'Ground' },
  { token: '--deep', label: 'Deep' },
  { token: '--iris', label: 'Iris' },
  { token: '--surface', label: 'Surface' },
  { token: '--halo', label: 'Halo' },
  { token: '--accent', label: 'Accent' },
];

export interface Specimen {
  readonly token: string;
  readonly role: string;
  readonly sample: string;
  readonly className: string;
}

export const specimens: readonly Specimen[] = [
  {
    token: '--font-display',
    role: 'Display',
    sample: 'We design the parts of a product people actually touch',
    className: 'bench-specimen-display',
  },
  {
    token: '--font-sans',
    role: 'Text',
    sample: 'Engagements run eight to sixteen weeks, with no account layer in between.',
    className: 'bench-specimen-sans',
  },
  {
    token: '--font-mono',
    role: 'Label',
    sample: 'Founded 2023 — Remote, Europe — Four to five projects a year',
    className: 'bench-specimen-mono',
  },
];

export interface Easing {
  readonly token: string;
  readonly label: string;
  /** The curve's control points, for drawing it. */
  readonly points: readonly [number, number, number, number];
  readonly note: string;
}

export const easings: readonly Easing[] = [
  {
    token: '--ease-out',
    label: 'Settle',
    points: [0.2, 0.7, 0.2, 1],
    note: 'Leaves quickly, arrives slowly. Everything that moves because you asked it to.',
  },
  {
    token: '--ease-land',
    label: 'Land',
    points: [0.16, 0.72, 0.24, 1],
    note: 'A longer tail. Used once, on the wordmark, which has further to travel.',
  },
];

export interface Duration {
  readonly token: string;
  readonly use: string;
}

export const durations: readonly Duration[] = [
  { token: '--dur-fast', use: 'Colour, hover, focus' },
  { token: '--dur-mid', use: 'Panels, surfaces' },
  { token: '--dur-slow', use: 'Reveals' },
];
