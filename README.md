# Elysia

A studio site built as a front-end engineering exercise: no framework, typed
content rendered to static HTML at build time, and a dot globe over the hero —
real continents, traffic arcing between them — that is deterministic,
frame-rate independent, and turns itself off when nobody is looking.

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
    globe/
      geo.ts            Pure: sphere coordinates, rotation, projection, slerp
      land.ts           Pure: bitmask lookup -> the points that are on land
      land-mask.ts      Generated: Natural Earth land as one bit per cell
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
- Skip link, visible focus rings, `scroll-padding-top` so the fixed header never
  covers an in-page target, `aria-current` on the section being read.

## Performance

Measured from `npm run build` (gzipped where it matters):

| Asset                   | Size    | Gzip   |
| ----------------------- | ------- | ------ |
| HTML                    | 12.0 kB | 3.3 kB |
| CSS                     | 11.8 kB | 3.7 kB |
| JS                      | 7.5 kB  | 3.2 kB |
| Fonts (2 latin subsets) | 105 kB  | —      |

Fonts are self-hosted and vendored by `npm run fonts:sync`: no third-party
request on first paint, no layout shift from a late stylesheet. Everything else
the page needs is a little over 12 kB on the wire.

The canvas pauses when the hero scrolls away, when the tab is hidden, and when
motion is reduced. Resizes are coalesced, and the device pixel ratio is capped
at 2 — above that the cost is real and the visible gain is not. Dots are drawn
as `fillRect`, not `arc`: at roughly two pixels across the difference is
invisible and the path setup is not.

## Tests

`npm test` — 132 tests, no browser required.

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

## Things deliberately not done

- **No framework.** Nothing on this page has state worth a runtime. A framework
  here would be a larger download than the entire site.
- **No light theme.** The design is one continuous twilight gradient; a light
  variant would be a different design, not a token swap.
- **No client-side routing.** It is one page.

## Credits

Typeset in [Archivo](https://fonts.google.com/specimen/Archivo) and
[IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono), both under the
SIL Open Font License. Coastlines from
[Natural Earth](https://www.naturalearthdata.com/) 110m physical land, public
domain. Code is MIT — see [LICENSE](LICENSE).
