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

/** A number worth putting in front of someone, and what it counts. */
export interface Metric {
  readonly value: string;
  readonly label: string;
}

/** One row of the work index, expandable into a case study. */
export interface Project {
  readonly slug: string;
  readonly name: string;
  /** The one-line scope shown in the collapsed row. */
  readonly scope: string;
  readonly year: number;
  readonly role: string;
  readonly duration: string;
  /** The situation before the engagement. Why there was a job here at all. */
  readonly problem: string;
  /** What was done, in paragraphs. Decisions, not deliverables. */
  readonly approach: readonly string[];
  /** What changed, stated so it could be checked. */
  readonly outcome: string;
  readonly metrics: readonly Metric[];
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

/** The panels of the deck, in order. The first one is what opens. */
export interface SectionEntry {
  readonly id: string;
  readonly label: string;
}

export const sections: readonly SectionEntry[] = [
  { id: 'practice', label: 'Practice' },
  { id: 'work', label: 'Work' },
  { id: 'studio', label: 'Studio' },
  { id: 'contact', label: 'Contact' },
];

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
    duration: '14 weeks',
    problem:
      'Four product teams had built four component sets from the same Figma file. A clinician moving between two modules in one shift met two different date pickers, two error conventions, and two definitions of critical.',
    approach: [
      'We did not start by drawing components. We started by cataloguing every state the four sets already had between them, which turned out to be sixty-three buttons that resolved to nine.',
      'What replaced them is token-driven and framework-agnostic, because two of the four teams were not going to migrate their framework and pretending otherwise would have produced a fifth set. Every accessibility behaviour the library promises is wired to a test, so the documentation cannot quietly go stale.',
    ],
    outcome:
      'Building a new screen went from a week of copy-paste to an afternoon. The audit that started the project now runs in CI against the live application, so drift is a failing build rather than a discovery.',
    metrics: [
      { value: '63 → 9', label: 'Button variants' },
      { value: '4 → 1', label: 'Component sets' },
      { value: '120', label: 'Screens at AA' },
    ],
    stack: ['TypeScript', 'Design tokens', 'Storybook', 'WCAG 2.2 AA'],
  },
  {
    slug: 'halcyon',
    name: 'Halcyon',
    scope: 'Identity and site for a synthetic biology lab',
    year: 2025,
    role: 'Identity, art direction, front-end build',
    duration: '9 weeks',
    problem:
      "The lab's most striking asset was its microscope imagery, and that imagery was also the reason nothing else on the page could be read.",
    approach: [
      'The mark is drawn to survive being placed on top of a photograph: one weight, one counter, and no detail that disappears below sixteen pixels. It was tested against the twenty worst images in their archive before it was tested against a white square.',
      'The site is static HTML. Imagery is processed at build time into three sizes and a blurred placeholder, so the type lands first and nothing moves after it.',
    ],
    outcome:
      'Holds a perfect performance score on a throttled connection, and the lab publishes new imagery without involving a developer.',
    metrics: [
      { value: '100', label: 'Lighthouse on 3G' },
      { value: '0.00', label: 'Cumulative layout shift' },
      { value: '11 kB', label: 'Critical path' },
    ],
    stack: ['Identity', 'Variable type', 'Static site', 'Image pipeline'],
  },
  {
    slug: 'northlight',
    name: 'Northlight',
    scope: 'Product design for a grid forecasting tool',
    year: 2025,
    role: 'Product design, research, prototyping',
    duration: '11 weeks',
    problem:
      'Operators did not trust the forecast, and the reason was visible in the chart: one confident line standing in for a number that was never a single number.',
    approach: [
      'We rebuilt the forecast around uncertainty bands, then spent most of the engagement on the legend — which is the part that decides whether a band reads as rigour or as hedging.',
      'Six operators replayed the same three past incidents against the old view and the new one. Three of them changed their decision, and two of those changes were the reason the design shipped in the shape it did.',
    ],
    outcome:
      'Operators stopped exporting to spreadsheets to sanity-check the model. The band became the default view in the downstream tools as well, which nobody had asked for at the start.',
    metrics: [
      { value: '3 of 6', label: 'Operators changed a call' },
      { value: '−40%', label: 'Spreadsheet exports' },
      { value: '3', label: 'Incidents replayed' },
    ],
    stack: ['Data visualisation', 'Prototyping', 'User research'],
  },
  {
    slug: 'tessellate',
    name: 'Tessellate',
    scope: 'Component library and documentation for an infrastructure team',
    year: 2024,
    role: 'Library architecture, documentation',
    duration: '8 weeks',
    problem:
      'The library was good. Its documentation described a version of it from eight months earlier, and every consuming team had quietly forked rather than argue with the docs.',
    approach: [
      "Each component's documented accessibility behaviour was rewritten as an executable test, and the documentation renders from that same source. A claim and its proof are now the same object.",
      'Docs deploy from the pipeline that publishes the package, so a change that breaks a promise fails before it ships rather than being discovered by the team that trusted it.',
    ],
    outcome:
      'The forks folded back in over a quarter. The docs cannot go stale, because a stale claim is a failing test rather than a stale sentence.',
    metrics: [
      { value: '9 → 0', label: 'Internal forks' },
      { value: '100%', label: 'Behaviours under test' },
      { value: '1', label: 'Source of truth' },
    ],
    stack: ['TypeScript', 'Testing Library', 'Docs as code'],
  },
  {
    slug: 'osmo',
    name: 'Osmo',
    scope: 'Motion language and interactive prototype for a hardware launch',
    year: 2024,
    role: 'Motion design, prototyping',
    duration: '10 weeks',
    problem:
      "Three agencies, one launch, and no shared definition of how anything should move. The device's own interface and the site announcing it did not agree on what fast meant.",
    approach: [
      'One easing family and three transition primitives, specified in prose and in code, so engineering could apply them correctly without a designer in the room.',
      'Every primitive ships with a reduced-motion counterpart that is a designed state rather than a disabled one — which is the difference between honouring the setting and punishing it.',
    ],
    outcome:
      'Applied across web, retail display and the device interface without a motion designer on the critical path for any of them.',
    metrics: [
      { value: '3', label: 'Transition primitives' },
      { value: '1', label: 'Easing family' },
      { value: 'Parity', label: 'Reduced-motion states' },
    ],
    stack: ['Motion spec', 'WebGL', 'Prototyping'],
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

/**
 * A run of prose that carries links.
 *
 * Content stays data rather than markup: a plain string is text and gets
 * escaped, an object is a link. Nothing here can inject HTML, and the sentence
 * still reads as a sentence in the source.
 */
export type Fragment = string | { readonly text: string; readonly href: string };

export const contact = {
  lede: 'Tell us what you are building.',

  note: [
    'Send a short note about the project, the timeline and who is on the team — we answer within two working days. If you would rather look before you write, there are ',
    { text: 'five projects', href: '#work' },
    ' written up in full, and ',
    { text: 'how we work', href: '#practice' },
    ' is the short version of the same thing. Or simply ',
    { text: 'say hello', href: `mailto:${meta.email}` },
    '.',
  ] as readonly Fragment[],

  place: 'Written and built remotely, from six desks across Europe.',
} as const;

/** The column beside the note. The footer below it carries no links of its own. */
export const contactLinks: readonly NavLink[] = [
  { href: `mailto:${meta.email}`, label: 'Email' },
  { href: '#work', label: 'Work' },
  { href: '#studio', label: 'Studio' },
];
