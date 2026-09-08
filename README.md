# Elysia

A studio site built as a front-end engineering exercise: no framework, typed
content rendered to static HTML at build time, and a planet over the hero —
real continents rendered as a heat map, a starfield, traffic arcing between
named cities — that is deterministic, frame-rate independent, and turns itself
off when nobody is looking.

**Elysia is not a real studio.** The copy and the case studies are invented so
that a realistic content model had something to model. The engineering is the
point of the repository.

```bash
npm install && npm run dev
```

## What is interesting here

|                                        |                                                                                                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zero client-side templating**        | Content lives in `src/content/site.ts` as typed data and is rendered into `index.html` by a Vite plugin at build time. The shipped page is complete markup: it reads with JavaScript disabled and crawlers get real text.                                     |
| **A nebula with no shader**            | Domain-warped fBm over seeded value noise, sampled on a coarse grid and pushed through a 256-entry colour ramp baked once at startup. No WebGL, no texture, no library — about 200 lines of pure functions and one `putImageData`.                            |
| **Deterministic simulation**           | The starfield and the noise field run on a seeded PRNG, so the same load produces the same sky — and a test can assert exact positions instead of statistical hand-waving.                                                                                    |
| **Fixed timestep**                     | Time is accumulated and consumed in whole 16.67ms steps, so the nebula drifts at the same speed on a 60Hz laptop and a 144Hz monitor. A tab restored after ten minutes does not replay ten minutes of simulation.                                             |
| **Self-governing effect**              | A quality governor watches median frame time and scales the sample resolution between 100% and 35%. A background animation should never be the reason a page drops frames.                                                                                    |
| **A ground scale that carries weight** | The page separates by plane, not by rule: five violet values, and the steps between them are measured. The seam between hero and deck once ran at a 1.028 contrast ratio, which is a decision you cannot see. It is 1.241 at the edge now, settling to 1.145. |
| **A footer with a horizon**            | The page opens in space and sets on one: a 5600px circle painted the colour of the ground it sits on, pushed down until only its rim shows, lit by three box-shadows in the order the hero's ramp uses them. One pseudo-element, no canvas.                   |
| **Prose that carries links**           | Copy is typed data, never markup: a run of text is an array where a string is escaped text and an object is a link. The contact note reads as a sentence in the source and cannot inject HTML into the page.                                                  |
| **Platform first**                     | Case studies are native `<details name="work">`: exclusive accordion behaviour, keyboard support and screen-reader semantics from the browser, animated with `interpolate-size` and `::details-content`. No script, no ARIA to keep in sync.                  |

## One hero

The landing page carries a single treatment: domain-warped noise, drifting,
through a colour ramp baked at startup.

It carried four for a while, behind a `?hero=` switch with tabs in the seam —
planet, eclipse, aurora, nebula — so they could be compared by looking rather
than by arguing. That was the right way to choose and the wrong way to ship: a
landing page with four moods has none. The three that lost are gone, and the
globe renderer went with them, which is most of why the JavaScript bundle is
11.15 kB rather than 29.20 kB.

Everything about _hosting_ an effect still lives in `hero/host.ts`: sizing for
the device pixel ratio, pausing off-screen and on a hidden tab, honouring
reduced motion, fixed-step time, and backing off when frames run long. A scene
is only `layout`, `step` and `draw`, so the seam where the alternatives plugged
in is still there — it is simply not carrying anything.

## Architecture

```
index.html              HTML shell with <!--@slot--> placeholders
plugins/
  html-content.ts       Vite plugin: fills slots, emits robots.txt + sitemap.xml
src/
  content/
    site.ts             All copy, as typed data
    render.ts           Pure content -> HTML (runs at build time only)
  features/
    nav.ts              Sticky header + scrollspy, both IntersectionObserver
    tabs.ts             A tab group: one panel at a time, arrows, roving focus
    bench.ts            Fills the specimen from the live cascade
    work.ts             Deep links: an open case study is addressable
    reveal.ts           Scroll-in transitions
    hero/
      host.ts           Canvas, events, timing, quality — everything but drawing
      scene.ts          What a hero has to implement: layout, step, draw
      noise.ts          Pure: seeded value noise and fBm
      ramp.ts           Pure: the colour ramp, baked to a 256-entry lookup
      stars.ts          Pure: the starfield and its twinkle
      scenes/nebula.ts  The one hero
  lib/
    loop.ts             Fixed-timestep render loop
    quality.ts          Frame-budget governor
    random.ts           Seeded PRNG
    motion.ts           prefers-reduced-motion, including live changes
    dom.ts              Typed query helpers, CSS token reader
  styles/               Cascade layers: tokens, base, layout, components, utilities
```

The dependency direction is one-way: `lib` knows nothing about the site,
`features` know nothing about each other, and `main.ts` wires them together with
each enhancement independently guarded — an unsupported API in one feature
cannot take the rest of the page down with it.

## Accessibility

- Complete, readable content with JavaScript off; the reveal animations only
  hide what a scripted page can reveal (`html.js`, set before first paint).
- `prefers-reduced-motion` is honoured **and watched**: the globe stops turning
  and is replaced by a still frame of the same scene — arcs mid-flight, not an
  empty canvas — and it responds if the setting is changed while the page is
  open.
- `prefers-contrast: more` raises the ink and rule opacities, rather than leaving
  the design sitting at 44% alpha for people who asked for more contrast.
- `prefers-reduced-transparency` turns the glass header and the availability
  badge solid, because the blur is decoration and some readers cannot use it.
- Skip link, visible focus rings, `scroll-padding-top` so the floating header
  never covers an in-page target, `aria-current` on the section being read.
- Header link colour is set from a contrast measurement, not by eye: at 10.5px
  uppercase, the muted ink used elsewhere sits under 4.5:1 on the capsule.

## Performance

Measured from `npm run build` (gzipped where it matters):

| Asset                   | Size    | Gzip   |
| ----------------------- | ------- | ------ |
| HTML                    | 12.0 kB | 3.3 kB |
| CSS                     | 11.8 kB | 3.7 kB |
| JS                      | 7.5 kB  | 3.2 kB |
| Fonts (2 latin subsets) | 105 kB  | —      |

Fonts are self-hosted and vendored by `npm run fonts:sync`: no third-party
request on first paint, no layout shift from a late stylesheet. Everything else the page needs is about 18 kB on the wire — and roughly 2 kB of
that is the three hero variants that will not survive the choice.

Stars are generated once per resize and then only read — a frame costs one
`fillRect` and one sine each.

The heat map is measured, not assumed. At full resolution it costs about 11ms a
frame on this machine and at one step coarser about 3ms, so it opens at the
coarser setting and the quality governor moves it up only if the frames allow
it. Quality here is a sample size rather than a count: a slower machine gets a
softer map, not a broken one.

The canvas pauses when the hero scrolls away, when the tab is hidden, and when
motion is reduced. Resizes are coalesced, and the device pixel ratio is capped
at 2 — above that the cost is real and the visible gain is not. Dots are drawn
as `fillRect`, not `arc`: at roughly two pixels across the difference is
invisible and the path setup is not.

## Tests

`npm test` — 216 tests, no browser required.

The suite covers the parts where being wrong is invisible: that the PRNG is
reproducible and uniform, that the timestep planner cannot spiral after a long
stall, that the governor ignores a single long frame but reacts to a sustained
one, that rotation is a rotation and never stretches the sphere, that a
great-circle path travels at a constant rate and stays on the surface, that arcs
retire instead of accumulating, and that every content slot the HTML asks for
actually exists.

The land mask gets its own tests, and they are the ones worth stealing: they
assert that the Sahara, Greenland, Siberia, Australia and Antarctica are land
while the mid-Pacific and the Arctic Ocean are not. A flipped row order or an
off-by-one in the projection fails all of them at once.

The city table is checked against that same mask — but within one cell, not
exactly on it. Nine of the cities are coastal, and at two degrees to a side
their own cell centre is legitimately offshore; asserting otherwise would be
asserting something false. The looser check still catches what matters, and a
companion test proves it can fail.

DOM behaviour is tested against controllable stand-ins rather than a real
browser: an `IntersectionObserver` the test drives by hand, a manually advanced
`requestAnimationFrame` clock, and a recording 2D context. That is enough to
assert the things that actually matter about the canvas — that it sizes itself
for the device pixel ratio, stops drawing when the hero scrolls away, paints a
still frame and never starts a loop when motion is reduced, and releases every
observer on `destroy()`.

## Commands

```bash
npm run dev          # dev server
npm run build        # typecheck, then build to dist/
npm run preview      # serve the built output
npm test             # unit tests
npm run coverage     # tests with coverage
npm run check        # everything CI runs
npm run fonts:sync   # re-vendor the font subsets
```

## Deployment

`.github/workflows/deploy.yml` publishes `dist/` to GitHub Pages on every push
to `main`. A project page is served from a subpath, so the workflow passes
`BASE_PATH=/<repo>/`; the same source builds for a domain root with no change.

## Surfaces, not rules

There is not a hairline in the page. Sections are separated by ground and space:
everything below the hero sits on a raised deck with a tab cut into its top
edge, list items are soft cards, work rows light up on hover, and a section
label is announced by a dot rather than by a rule drawn across the page. The
only borders left are the ones that describe a shape — the header capsule and
the availability badge.

## Type

Nothing is set in capitals, and nothing is tracked. Uppercase with wide
letter-spacing is how plain type is made to look considered; these faces have
their own character and do not need either. Small text is set in the reading
face at a slightly heavier weight — the way a magazine sets a caption — and the
monospace is kept for the things that genuinely are values: a year, a token
name, a duration.

The display face is a system rather than a family, because swapping one for
another and leaving the weight, tracking and leading alone gets you a worse
version of both. Each set carries its own five tokens, and `?type=` switches
between them:

|           |                                                                                          |
| --------- | ---------------------------------------------------------------------------------------- |
| `grotesk` | **Default.** Syne for display, Inter for reading. Wide, architectural, contemporary.     |
| `serif`   | Instrument Serif for display. Editorial, high contrast, set tight.                       |
| `mono`    | IBM Plex Mono all the way up. Technical, and the hardest of the three to read at length. |

Four faces are declared and a visit downloads two or three: a browser only
fetches a face something on the page is actually set in, so the display faces
the current set does not use cost nothing.

The set is applied by the inline script in the head, before first paint — from a
module it would render in one face and reflow into another. The default set is
the one on bare `:root`, so it needs no attribute and no script at all.

## Things deliberately not done

- **No framework.** Nothing on this page has state worth a runtime. A framework
  here would be a larger download than the entire site.
- **No light theme.** The design is one continuous twilight gradient; a light
  variant would be a different design, not a token swap.
- **No client-side routing.** It is one page.

## Credits

Typeset in [Syne](https://fonts.google.com/specimen/Syne),
[Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif),
[Inter](https://fonts.google.com/specimen/Inter) and
[IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono), all under the
SIL Open Font License. Coastlines from
[Natural Earth](https://www.naturalearthdata.com/) 110m physical land, public
domain. Code is MIT — see [LICENSE](LICENSE).
