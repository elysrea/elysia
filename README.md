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

|                                         |                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zero client-side templating**         | Content lives in `src/content/site.ts` as typed data and is rendered into `index.html` by a Vite plugin at build time. The shipped page is complete markup: it reads with JavaScript disabled and crawlers get real text.                                                                                       |
| **A globe with no globe library**       | Continents come from Natural Earth polygons baked into a 2.7 kB bitmask at build time (`npm run land:sync`). The browser gets an array lookup instead of a GeoJSON, a projection library, or a map tile server. Rotation, orthographic projection and great-circle paths are about 150 lines of pure functions. |
| **Deterministic simulation**            | The dot lattice and the arc traffic run on a seeded PRNG, so the same load produces the same globe — and a test can assert exact positions instead of statistical hand-waving.                                                                                                                                  |
| **Fixed timestep**                      | Time is accumulated and consumed in whole 16.67ms steps, so the globe turns at the same speed on a 60Hz laptop and a 144Hz monitor. A tab restored after ten minutes does not replay ten minutes of simulation.                                                                                                 |
| **Self-governing effect**               | A quality governor watches median frame time and scales the dot count between 100% and 35%. A background animation should never be the reason a page drops frames.                                                                                                                                              |
| **One source of truth for the horizon** | `--horizon` is declared once in CSS. The gradient, the rule, and the globe's placement all read that value; the canvas asks the cascade rather than restating the breakpoints in JavaScript.                                                                                                                    |
| **Platform first**                      | Case studies are native `<details name="work">`: exclusive accordion behaviour, keyboard support and screen-reader semantics from the browser, animated with `interpolate-size` and `::details-content`. No script, no ARIA to keep in sync.                                                                    |

## Four heroes, one page

The hero is swappable, and the switch is in the page: the tabs in the seam
between the hero and the content change it in place, without a reload. They are
real links to `?hero=…`, so they still work with JavaScript off — it just costs
a navigation. What the script adds is not the ability to switch but the ability
to switch _without losing the animation you were comparing_.

|           |                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------- |
| `planet`  | The heat-map globe. Literal, informational, the most to say.                                                              |
| `eclipse` | A black body with a corona burning around it. Four gradients and a filled circle — the whole scene is about thirty lines. |
| `aurora`  | Curtains of light low in the frame, each one filled path whose edge is a sum of three sines.                              |
| `nebula`  | Domain-warped noise through the same colour ramp the planet uses, drifting.                                               |

Four is arguably three too many for a finished site, and the switcher is a
demo affordance rather than a feature a studio would ship. Both are one commit
from being deleted: the catalogue drives the tabs, the registry builds the
scenes, and a test keeps the two in step.

Everything about _hosting_ an effect is shared and lives in `hero/host.ts`:
sizing for the device pixel ratio, pausing off-screen and on a hidden tab,
honouring reduced motion, fixed-step time, and backing off when frames run long.
A scene is only `layout`, `step` and `draw` — which is why the three
alternatives are small.

## Architecture

```
index.html              HTML shell with <!--@slot--> placeholders
plugins/
  html-content.ts       Vite plugin: fills slots, emits robots.txt + sitemap.xml
scripts/
  build-land-mask.js    Natural Earth polygons -> a committed bitmask
src/
  content/
    site.ts             All copy, as typed data
    render.ts           Pure content -> HTML (runs at build time only)
  features/
    nav.ts              Sticky header + scrollspy, both IntersectionObserver
    reveal.ts           Scroll-in transitions
    hero/
      host.ts           Canvas, events, timing, quality — everything but drawing
      scene.ts          What a hero has to implement: layout, step, draw
      noise.ts          Pure: seeded value noise and fBm
      catalogue.ts      The heroes as data, imported by the build-time renderer
      switcher.ts       Turns the seam tabs into an in-place hero switch
      scenes/           planet, eclipse, aurora, nebula
    globe/
      geo.ts            Pure: sphere coordinates, rotation, projection, slerp
      land.ts           Pure: bitmask lookup -> the points that are on land
      land-mask.ts      Generated: Natural Earth land as one bit per cell
      cities.ts         The named places arcs travel between
      heat.ts           Pure: land + city activity -> a heat texture and ramp
      surface.ts        Pure: the per-pixel renderer and its lookup tables
      stars.ts          Pure: the starfield and its twinkle
      arcs.ts           The travelling connections and their lifecycle
      globe-field.ts    Canvas, browser events, and when not to run
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

`npm test` — 189 tests, no browser required.

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
npm run land:sync    # regenerate the land mask from Natural Earth
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

Nothing is set in capitals — including the city names drawn on the canvas. The
type has enough character without shouting, and lower case is easier to read at
the sizes the labels actually use.

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
