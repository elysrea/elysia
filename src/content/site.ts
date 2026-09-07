/**
 * The single source of truth for everything the page says.
 *
 * Content lives in typed data rather than in markup so it can be validated by
 * the compiler, rendered to static HTML at build time (see `plugins/html-content.ts`)
 * and reused for structured data and the sitemap without drifting out of sync.
 *
 * Elysia is a fictional studio. The copy exists to exercise a real content model.
 */

export interface NavLink {
  readonly href: string;
  readonly label: string;
}

export interface Capability {
  readonly title: string;
  readonly detail: string;
}

/** One row of the work index, expandable into a short case study. */
export interface Project {
  readonly slug: string;
  readonly name: string;
  /** The one-line scope shown in the collapsed row. */
  readonly scope: string;
  readonly year: number;
  readonly role: string;
  readonly outcome: string;
  readonly stack: readonly string[];
}

export interface Fact {
  readonly label: string;
  readonly value: string;
}

export interface SiteMeta {
  readonly name: string;
  readonly tagline: string;
  readonly description: string;
  readonly url: string;
  readonly email: string;
  readonly founded: number;
}

export const meta: SiteMeta = {
  name: 'Elysia',
  tagline: 'A design and technology studio',
  description:
    'Elysia is a design and technology studio. We work with small teams on interfaces, identity and the front-end that ships.',
  url: 'https://elysia.example',
  email: 'studio@elysia.example',
  founded: 2023,
};

export const navLinks: readonly NavLink[] = [
  { href: '#practice', label: 'Practice' },
  { href: '#work', label: 'Work' },
  { href: '#studio', label: 'Studio' },
];

/** The one action in the header. Contact is a call to action, not a page. */
export const navCta = {
  href: '#contact',
  label: 'Start a project',
  /** Shown instead of the full label where the header has no room. */
  short: 'Start',
} as const;

/** The standing note above the wordmark. Null hides it entirely. */
export const announcement: {
  readonly tag: string;
  readonly text: string;
  readonly href: string;
} | null = {
  tag: 'Now',
  text: 'Booking projects for Q3',
  href: '#contact',
};

export const practice = {
  lede: 'We design the parts of a product people actually touch.',
  body: [
    'Interface, motion, identity, and the front-end code that ships them. We stay on a project through build, so the thing that launches is the thing that was designed.',
    'Engagements run eight to sixteen weeks. We work directly with founders and product leads — no account layer, no handoff document standing in for a conversation.',
  ],
} as const;

export const capabilities: readonly Capability[] = [
  { title: 'Product design', detail: 'Flows, states and the edges nobody specs' },
  { title: 'Interface systems', detail: 'Tokens, components, and the rules that hold them' },
  { title: 'Brand identity', detail: 'Marks, type, and how they behave in motion' },
  { title: 'Motion and interaction', detail: 'Timing that reads as intent, not decoration' },
  { title: 'Front-end engineering', detail: 'Typed, tested, accessible, and shipped' },
  { title: 'Prototyping', detail: 'Working answers to questions a mockup cannot settle' },
];

export const projects: readonly Project[] = [
  {
    slug: 'meridian',
    name: 'Meridian',
    scope: 'Design system and front-end for a clinical data platform',
    year: 2026,
    role: 'Design system lead, front-end build',
    outcome:
      'Replaced four divergent component sets with one token-driven library. Onboarding for a new screen went from a week of copy-paste to an afternoon.',
    stack: ['TypeScript', 'Design tokens', 'Storybook', 'WCAG 2.2 AA'],
  },
  {
    slug: 'halcyon',
    name: 'Halcyon',
    scope: 'Identity and site for a synthetic biology lab',
    year: 2025,
    role: 'Identity, art direction, build',
    outcome:
      'A mark and type system that survives a microscope image behind it. The site ships as static HTML and holds a 100 Lighthouse performance score on 3G.',
    stack: ['Identity', 'Variable type', 'Static site', 'Canvas'],
  },
  {
    slug: 'northlight',
    name: 'Northlight',
    scope: 'Product design for a grid forecasting tool',
    year: 2025,
    role: 'Product design, interaction prototyping',
    outcome:
      'Reframed the forecast view around uncertainty bands instead of single lines. Operators stopped exporting to spreadsheets to sanity-check the model.',
    stack: ['Data visualisation', 'Prototyping', 'User research'],
  },
  {
    slug: 'tessellate',
    name: 'Tessellate',
    scope: 'Component library and documentation for an infrastructure team',
    year: 2024,
    role: 'Library architecture, documentation',
    outcome:
      'Documented every component against the accessibility behaviour it promises, then wired those promises to tests so the docs cannot quietly go stale.',
    stack: ['TypeScript', 'Testing Library', 'Docs as code'],
  },
  {
    slug: 'osmo',
    name: 'Osmo',
    scope: 'Motion language and interactive prototype for a hardware launch',
    year: 2024,
    role: 'Motion design, WebGL prototype',
    outcome:
      'One easing family and three transition primitives, specified so engineering could apply them without a designer in the room.',
    stack: ['Motion spec', 'WebGL', 'Reduced-motion parity'],
  },
];

export const studio = {
  lede: 'Six people, four or five projects a year.',
  body: [
    'We keep the studio small on purpose. Every project gets the people who pitched it, from the first sketch to the last pull request.',
    'We work remotely across Europe and meet in person at the start of each engagement. If a project needs a skill we do not have, we say so early and bring in someone who does.',
  ],
} as const;

export const facts: readonly Fact[] = [
  { label: 'Founded', value: '2023' },
  { label: 'Team', value: 'Six' },
  { label: 'Based', value: 'Remote, Europe' },
  { label: 'Capacity', value: 'Four to five projects a year' },
];

export const contact = {
  lede: 'Tell us what you are building.',
  note: 'Send a short note about the project, the timeline, and who is on the team. We answer within two working days.',
} as const;

export const footerLinks: readonly NavLink[] = [
  { href: '#work', label: 'Work' },
  { href: '#studio', label: 'Studio' },
  { href: `mailto:${meta.email}`, label: 'Email' },
];
