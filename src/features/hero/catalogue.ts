/**
 * The hero treatments, as data.
 *
 * This module deliberately imports nothing: the build-time HTML renderer needs
 * the list to draw the tabs, and it cannot pull in scene classes that expect a
 * DOM. The registry in `index.ts` is checked against this list by a test, so
 * the two cannot drift.
 */
export interface HeroEntry {
  /** URL value and registry key. */
  readonly name: string;
  readonly label: string;
  /** One line, used as the tab's title attribute. */
  readonly blurb: string;
}

export const HERO_CATALOGUE: readonly HeroEntry[] = [
  { name: 'nebula', label: 'Nebula', blurb: 'Domain-warped noise, drifting' },
  { name: 'planet', label: 'Planet', blurb: 'The world as a heat map' },
  { name: 'eclipse', label: 'Eclipse', blurb: 'A black body and its corona' },
  { name: 'aurora', label: 'Aurora', blurb: 'Curtains of light' },
];

export const DEFAULT_HERO = 'nebula';
