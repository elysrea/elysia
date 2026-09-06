# Decisions

Short notes on the choices that were not obvious, kept for the same reason a
commit message is kept: the code shows what, not why.

## Content is rendered at build time, not in the browser

**Context.** The site is a handful of static sections whose copy should live in
one typed place rather than being scattered through markup.

**Options.** Hand-maintained HTML (drifts, no types); client-side templating
(an empty shell before hydration, invisible to crawlers, JavaScript required to
read a paragraph); build-time rendering.

**Decision.** A Vite plugin fills `<!--@slot-->` placeholders from
`src/content/render.ts` during `transformIndexHtml`. Content stays typed, the
output stays static, and the runtime cost is zero.

**Consequence.** Content changes need a rebuild — trivially handled by HMR in
dev, where the plugin forces a full reload on any change under `src/content/`.
An unknown or unfilled placeholder throws, so a hole in the page fails the build
instead of shipping.

## Fixed timestep instead of per-frame increments

**Context.** The original prototype advanced the simulation by a constant amount
every animation frame.

**Problem.** That ties speed to refresh rate: the animation ran roughly twice as
fast on a 120Hz display and slowed whenever the machine was busy. Restoring a
backgrounded tab replayed the entire gap in one frame.

**Decision.** `RenderLoop` accumulates elapsed time and runs whole 16.67ms
steps, clamping any single frame to 100ms and capping the steps per frame.

**Consequence.** Motion is identical everywhere, the simulation cannot spiral,
and `planSteps` is a pure function, so all of this is tested without a browser.

## A seeded PRNG

`Math.random` cannot be reproduced, which makes a generated scene impossible to
test and impossible to debug from a screenshot. `mulberry32` is 8 lines, has no
dependencies, and makes "the same seed draws the same globe" an assertion rather
than a hope.

## The globe is drawn, not embedded

**Context.** The hero needed a subject with more to say than drifting lines. A
rotating globe with traffic between landmasses is the reference; the question
was how to get one.

**Options.** A map SDK (Mapbox, MapLibre) gives a real globe and costs an API
key, a tile server, a third-party request on first paint and several hundred
kilobytes. A globe library (three-globe, globe.gl) drags in WebGL and a scene
graph for one static camera. Or draw it.

**Decision.** Draw it. The whole thing is orthographic projection and great
circles — a page of trigonometry — over a land mask baked at build time from
Natural Earth polygons by `scripts/build-land-mask.js`. The mask is one bit per
two-degree cell, 2.7 kB base64, committed as generated source.

**Consequence.** No key, no network, no runtime geo dependency, and the globe
is made of pure functions that a test can interrogate directly. The trade is
that it is a stylised globe and always will be: there are no labels, no zoom and
no projection other than the one it was built for. That is the right trade for a
hero image and the wrong one for a map.

## Dots on the far side are drawn too

An orthographic globe only shows a hemisphere, so the back half could be culled
outright. Drawing it at a fraction of the brightness costs one `fillRect` per
point and turns a flat disc into something with a volume you can read. The limb
gets a faint rim gradient for the same reason: without an edge, the unlit side
of the dot field reads as a scatter rather than a sphere.

## Native `<details>` for the case studies

A scripted disclosure needs `aria-expanded`, `aria-controls`, keyboard handling,
focus management, and its own state — all of which the browser already
implements. `<details name="work">` also gives exclusive-accordion behaviour for
free. Animation uses `interpolate-size` and `::details-content`; where those are
unsupported the panel simply appears, which is an acceptable difference.

## The canvas reads `--horizon` from CSS

The horizon moves at two breakpoints. The prototype restated those breakpoints
in JavaScript, so the gradient and the particle field could disagree. The canvas
now reads the computed custom property, which makes the cascade the single
source of truth and deletes a whole class of drift bug.

## Quality is governed, not assumed

Rather than guessing a particle count from a device check, the field measures
its own frame cost. The governor uses the median of a window of samples so one
long frame — every page has them — does not trigger a downgrade, steps down in
large decrements and recovers in small ones, so the field never visibly pulses.

## Reduced motion gets a picture, not a blank

Turning the effect off entirely would leave the hero with a flat gradient and
lose the composition. Instead the same simulation is run forward until arcs are
in flight and then drawn once: the animation, paused.
